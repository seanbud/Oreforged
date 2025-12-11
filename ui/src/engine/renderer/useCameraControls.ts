import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
    ROTATION_SENSITIVITY,
    DRAG_THRESHOLD_PIXELS,
    RIGHT_CLICK_DRAG_THRESHOLD_PIXELS,
    DRAG_THRESHOLD_TIME_MS,
    SLIDE_DURATION_MS,
    CAMERA_SMOOTHING,
    FRICTION
} from '../../game/data/Config';

interface CameraControlsProps {
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    autoRotate?: boolean;
    rotationSpeed?: number;
    onTap?: (e: MouseEvent) => void;
    getHoveredBlock?: (clientX: number, clientY: number) => { worldPos: THREE.Vector3, intersectionPoint?: THREE.Vector3 } | null;
}

export function useCameraControls({
    camera,
    renderer,
    autoRotate = false,
    rotationSpeed = 0,
    onTap,
    getHoveredBlock
}: CameraControlsProps) {

    // --- State ---

    // The point we are orbiting / panning around
    const targetPosition = useRef(new THREE.Vector3(0, 0, 0));

    // Spherical coordinates for Orbiting (Radius, Phi (polar), Theta (equator))
    const spherical = useRef(new THREE.Spherical(56.5, Math.PI / 4, Math.PI / 4));

    // Smoothing Targets
    const desiredTheta = useRef(spherical.current.theta);
    const desiredPhi = useRef(spherical.current.phi);

    // Slide Animation
    const isSliding = useRef(false);
    const slideStartTime = useRef(0);
    const slideStartTarget = useRef(new THREE.Vector3());
    const slideEndTarget = useRef(new THREE.Vector3());

    // Drag State
    const isDraggingRef = useRef(false);
    const dragStartTimeRef = useRef(0);
    const dragStartPosRef = useRef({ x: 0, y: 0 });
    const previousMousePosition = useRef({ x: 0, y: 0 });
    const activeButtonRef = useRef<number | null>(null);

    // Panning / Momentum
    const velocity = useRef({ x: 0, z: 0 });
    const velocityHistory = useRef<{ x: number, z: number }[]>([]);
    const lastMoveTime = useRef(0);

    // --- Handlers ---

    const handleMouseDown = useCallback((e: MouseEvent) => {
        if (!e.target || (e.target as HTMLElement).tagName !== 'CANVAS') return;
        if (activeButtonRef.current !== null) return; // Prevent multi-button weirdness

        activeButtonRef.current = e.button;
        isDraggingRef.current = false;
        dragStartTimeRef.current = Date.now();
        dragStartPosRef.current = { x: e.clientX, y: e.clientY };
        previousMousePosition.current = { x: e.clientX, y: e.clientY };

        // Stop momentum on click
        velocity.current = { x: 0, z: 0 };
        velocityHistory.current = [];

        // RIGHT CLICK PIVOT LOGIC
        // Set rotation pivot to the block at screen center (no slide animation)
        if (e.button === 2 && getHoveredBlock && camera && renderer) {
            // Get block at screen center
            const rect = renderer.domElement.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const hit = getHoveredBlock(centerX, centerY);
            if (hit && hit.worldPos) {
                // Calculate new pivot (XZ from hit, Y from current target)
                // Use intersectionPoint for exactness if available, otherwise fallback to block center
                // KEY FIX: Must use Y from intersection too, otherwise pivot is off the view ray -> Snapping!
                const pivotX = hit.intersectionPoint ? hit.intersectionPoint.x : hit.worldPos.x;
                const pivotY = hit.intersectionPoint ? hit.intersectionPoint.y : hit.worldPos.y;
                const pivotZ = hit.intersectionPoint ? hit.intersectionPoint.z : hit.worldPos.z;

                const newTarget = new THREE.Vector3(pivotX, pivotY, pivotZ);

                // Recalculate spherical to keep camera at same world position
                const currentCamPos = camera.position.clone();
                const newOffset = new THREE.Vector3().subVectors(currentCamPos, newTarget);
                const newSpherical = new THREE.Spherical().setFromVector3(newOffset);

                // Update both target and spherical (camera won't move visually)
                targetPosition.current.copy(newTarget);
                spherical.current.copy(newSpherical);
                desiredTheta.current = newSpherical.theta;
                desiredPhi.current = newSpherical.phi;
            }
        }

    }, [camera, renderer, getHoveredBlock]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!camera || !renderer) return;
        if (activeButtonRef.current === null) return; // Not dragging

        // Ignore SHIFT
        if (e.shiftKey) return;

        const currentPos = { x: e.clientX, y: e.clientY };

        // 1. Detect Drag Start
        if (!isDraggingRef.current) {
            const dist = Math.sqrt(
                Math.pow(currentPos.x - dragStartPosRef.current.x, 2) +
                Math.pow(currentPos.y - dragStartPosRef.current.y, 2)
            );

            let threshold = DRAG_THRESHOLD_PIXELS;
            if (activeButtonRef.current === 2) threshold = RIGHT_CLICK_DRAG_THRESHOLD_PIXELS;

            if (dist > threshold) {
                isDraggingRef.current = true;
            }
        }

        if (isDraggingRef.current) {
            const deltaX = currentPos.x - previousMousePosition.current.x;
            const deltaY = currentPos.y - previousMousePosition.current.y;

            // RIGHT DRAG: Rotation (Y-axis only, yaw)
            if (activeButtonRef.current === 2) {
                // Only rotate around Y axis (theta = yaw)
                desiredTheta.current -= deltaX * ROTATION_SENSITIVITY;
                // Phi (pitch) stays locked - no vertical rotation
            }

            // LEFT DRAG: Panning (Restored Analytic + Velocity)
            if (activeButtonRef.current === 0) {
                const dist = camera.position.distanceTo(targetPosition.current);
                const vFOV = THREE.MathUtils.degToRad(camera.fov);
                const visibleHeight = 2 * Math.tan(vFOV / 2) * dist;
                const visibleWidth = visibleHeight * camera.aspect;

                const rect = renderer.domElement.getBoundingClientRect();
                const unitsPerPixelX = visibleWidth / rect.width;
                const unitsPerPixelY = visibleHeight / rect.height;

                const forward = new THREE.Vector3();
                camera.getWorldDirection(forward);
                const pitch = Math.abs(forward.y);
                const groundFactor = pitch < 0.1 ? 10 : 1 / pitch; // Flatten movement when looking level

                forward.y = 0; forward.normalize();
                const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));

                // INVERTED from previous implementation to fix user report?
                // User said "left click drag is now inverted... the old way was perfect"
                // My recent change was "AddScaledVector(..., -delta)". 
                // Old code was "moveX = -deltaX... moveZ = deltaY" -> add(moveVec).
                // Wait, standard pan: Drag Left -> Camera moves Left -> World looks like it moves Right.
                // "Drag the World": Drag Left -> World moves Left -> Camera moves Right.
                // The old code: `moveX = -deltaX`. deltaX positive (right) -> moveX negative (left). 
                // Let's stick to EXACTLY the math from the old file I just read.

                const moveX = -deltaX * unitsPerPixelX;
                const moveZ = deltaY * unitsPerPixelY * groundFactor;

                const moveVec = new THREE.Vector3();
                moveVec.addScaledVector(right, moveX);
                moveVec.addScaledVector(forward, moveZ);

                // Apply immediately
                targetPosition.current.add(moveVec);

                // Velocity History
                velocityHistory.current.push({ x: moveVec.x, z: moveVec.z });
                if (velocityHistory.current.length > 5) velocityHistory.current.shift();
                lastMoveTime.current = Date.now();
            }
        }

        previousMousePosition.current = currentPos;
    }, [camera, renderer]);

    const handleMouseUp = useCallback((e: MouseEvent) => {
        const duration = Date.now() - dragStartTimeRef.current;
        const dist = Math.sqrt(
            Math.pow(e.clientX - dragStartPosRef.current.x, 2) +
            Math.pow(e.clientY - dragStartPosRef.current.y, 2)
        );

        // TAP Actions
        let threshold = DRAG_THRESHOLD_PIXELS;
        if (e.button === 2) threshold = RIGHT_CLICK_DRAG_THRESHOLD_PIXELS;

        if (!isDraggingRef.current && dist < threshold && duration < DRAG_THRESHOLD_TIME_MS) {
            // Left Tap: Mine
            if (e.button === 0 && onTap) {
                onTap(e);
            }
            // Right Tap: REMOVED (Merged into Drag-Focus)
            // But if they just tap without dragging, should it still focus?
            // "any time you do a right-click-drag... focus onto that block AND drags".
            // A simple tap is a drag of length 0. So yes, it should have focused already on MouseDown.
            // But the Slide animation? Maybe unnecessary if we instant-snapped.
            // Let's rely on MouseDown snapshot.
        }

        // Momentum Release (Left Click)
        if (isDraggingRef.current && e.button === 0) {
            if (Date.now() - lastMoveTime.current < 50 && velocityHistory.current.length > 0) {
                let avgX = 0, avgZ = 0;
                for (const v of velocityHistory.current) {
                    avgX += v.x;
                    avgZ += v.z;
                }
                // Apply 'Throw'
                velocity.current = {
                    x: avgX / velocityHistory.current.length,
                    z: avgZ / velocityHistory.current.length
                };
            }
        }

        isDraggingRef.current = false;
        activeButtonRef.current = null;
    }, [onTap]);

    const handleWheel = useCallback((e: WheelEvent) => {
        if (!camera) return;
        e.preventDefault();

        const delta = e.deltaY > 0 ? 1 : -1;
        const zoomSpeed = 1.1;

        // Adjust spherical radius for zoom
        if (delta > 0 && spherical.current.radius < 400) {
            spherical.current.radius *= zoomSpeed;
        } else if (delta < 0 && spherical.current.radius > 20) {
            spherical.current.radius /= zoomSpeed;
        }
    }, [camera]);

    useEffect(() => {
        if (!renderer) return;
        const dom = renderer.domElement;

        dom.addEventListener('mousedown', handleMouseDown);
        dom.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        dom.addEventListener('contextmenu', (e) => e.preventDefault());

        return () => {
            dom.removeEventListener('mousedown', handleMouseDown);
            dom.removeEventListener('wheel', handleWheel);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [renderer, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel]);

    // Loop
    const update = useCallback(() => {
        if (!camera) return;

        // 1. Handle Slide Animation (for right-click focus)
        if (isSliding.current) {
            const now = Date.now();
            const elapsed = now - slideStartTime.current;
            const alpha = Math.min(1.0, elapsed / SLIDE_DURATION_MS);
            // Ease Out Cubic
            const t = 1 - Math.pow(1 - alpha, 3);
            targetPosition.current.lerpVectors(slideStartTarget.current, slideEndTarget.current, t);
            if (alpha >= 1.0) {
                isSliding.current = false;
            }
        }

        // 2. Momentum (Pan)
        if (Math.abs(velocity.current.x) > 0.0001 || Math.abs(velocity.current.z) > 0.0001) {
            const moveVec = new THREE.Vector3(velocity.current.x, 0, velocity.current.z);
            targetPosition.current.add(moveVec);

            // Friction
            velocity.current.x *= FRICTION;
            velocity.current.z *= FRICTION;

            if (Math.abs(velocity.current.x) < 0.0001) velocity.current.x = 0;
            if (Math.abs(velocity.current.z) < 0.0001) velocity.current.z = 0;
        }

        // 3. Auto-Rotate
        if (autoRotate && rotationSpeed !== 0 && !isDraggingRef.current && !isSliding.current) {
            desiredTheta.current += 0.005 * rotationSpeed;
        }

        // 4. Update Angle (Smoothing check)
        if (CAMERA_SMOOTHING > 0) {
            spherical.current.theta += (desiredTheta.current - spherical.current.theta) * CAMERA_SMOOTHING;
            spherical.current.phi += (desiredPhi.current - spherical.current.phi) * CAMERA_SMOOTHING;
        } else {
            spherical.current.theta = desiredTheta.current;
            spherical.current.phi = desiredPhi.current;
        }

        // 5. Update Camera
        const offset = new THREE.Vector3().setFromSpherical(spherical.current);
        camera.position.copy(targetPosition.current).add(offset);
        camera.lookAt(targetPosition.current);

    }, [camera, autoRotate, rotationSpeed]);

    return { update };
}
