import { Facet } from '@react-facet/core';
import { facetManager } from './bridge';

export function remoteFacet<T>(id: string, initialValue: T): Facet<T> {
    return facetManager.getFacet(id, initialValue);
}

export function useRemoteFacet<T>(facet: Facet<T>): Facet<T> {
    return facet;
}
