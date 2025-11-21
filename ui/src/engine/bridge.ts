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

declare global {
    interface Window {
        OreForged: {
            updateFacet: (id: string, value: any) => void;
        };
    }
}

window.OreForged = window.OreForged || {};
window.OreForged.updateFacet = (id, value) => {
    facetManager.updateFacet(id, value);
};

export function updateGame(key: string, value: any) {
    if ((window as any).updateState) {
        (window as any).updateState(key, value);
    }
}
