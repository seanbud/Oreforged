import { Facet } from '@react-facet/core';
import { facetManager } from './bridge';
import { useState, useEffect } from 'react';

export function remoteFacet<T>(id: string, initialValue: T): Facet<T> {
    return facetManager.getFacet(id, initialValue);
}

export function useRemoteFacet<T>(facet: Facet<T>): Facet<T> {
    return facet;
}

export function useFacetState<T>(facet: Facet<T>): T {
    const [value, setValue] = useState(facet.get() as T);
    useEffect(() => facet.observe(setValue), [facet]);
    return value;
}
