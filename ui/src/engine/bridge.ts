import { createFacet, Facet, WritableFacet } from '@react-facet/core';

class FacetManager {
    private facets = new Map<string, WritableFacet<any>>();

    getFacet<T>(id: string, initialValue: T): Facet<T> {
        if (!this.facets.has(id)) {
            this.facets.set(id, createFacet({ initialValue }));
        }
        return this.facets.get(id)!;
    }

    updateFacet(id: string, value: any) {
        console.log(`Facet Update: ${id}`, typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : value);
        try {
            if (this.facets.has(id)) {
                this.facets.get(id)!.set(value);
            } else {
                console.log(`Creating new facet: ${id}`);
                this.facets.set(id, createFacet({ initialValue: value }));
            }
        } catch (error) {
            console.error(`Error updating facet ${id}:`, error);
        }
    }
}

export const facetManager = new FacetManager();

window.OreForged = window.OreForged || {};
window.OreForged.updateFacet = (id, value) => {
    facetManager.updateFacet(id, value);
};

const call = (name: string, args: any[]) => {
    // The C++ webview bind adds the function to window
    if ((window as any)[name]) {
        return (window as any)[name](JSON.stringify(args));
    }
    // Fallback or debug
    console.warn(`Bridge call failed: ${name} not found on window object`);
    // Mock for dev in browser?
    return Promise.resolve();
};

export const bridge = {
    call,
    uiReady: () => {
        if ((window as any).uiReady) {
            (window as any).uiReady();
        }
    },
    regenerateWorld: async (seed: number, size?: number, height?: number, oreMult?: number, treeMult?: number) => {
        const args = [seed, size || 6, height || 16, oreMult || 1.0, treeMult || 1.0];
        console.log("Bridge regenerating world:", args);
        return call('regenerateWorld', args);
    },
    quitApplication: async () => {
        return call('quitApplication', []);
    }
};

declare global {
    interface Window {
        OreForged: {
            updateFacet: (id: string, value: any) => void;
            uiReady?: () => void;
        };
        uiReady?: () => void;
    }
}
