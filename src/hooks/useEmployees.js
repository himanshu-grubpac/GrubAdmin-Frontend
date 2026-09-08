import { useState, useEffect, useCallback, useRef } from 'react';
import { employeeService } from '@/api/services/employeeService';
import { useEmployeeStore } from '@/store/employeeStore';

const STATUS = { IDLE: 'idle', LOADING: 'loading', SUCCESS: 'success', ERROR: 'error' };

export function useEmployees(params = {}) {
  const {
    searchValue = '',
    selectedRole = [],
    filterStatus = '',
    currentPage = 1,
    pageSize = 10,
    selectedEmployeeId = null,
  } = params;

  const [status, setStatus] = useState(STATUS.LOADING);
  const [employees, setEmployees] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);
  const [isRefetching, setIsRefetching] = useState(false);

  const store = useEmployeeStore();
  const fetchIdRef = useRef(0);
  const mountedRef = useRef(false);
  const statusRef = useRef(status);
  const paramsRef = useRef(params);

  statusRef.current = status;
  paramsRef.current = params;

  const paramsKey = JSON.stringify({
    searchValue, selectedRole, filterStatus, currentPage, pageSize, selectedEmployeeId,
  });

  const fetchData = useCallback(async ({ silent } = {}) => {
    const fetchId = ++fetchIdRef.current;

    if (!silent) {
      setIsRefetching(false);
      setError(null);
    }

    const p = paramsRef.current;
    const apiParams = {};
    if (p.searchValue && p.searchValue.trim()) apiParams.query = p.searchValue.trim();
    if (p.selectedRole && p.selectedRole.length > 0) apiParams.role = p.selectedRole;
    if (p.filterStatus && p.filterStatus.trim()) apiParams.status = p.filterStatus.trim();
    apiParams.page_number = p.currentPage;
    apiParams.page_size = p.pageSize;

    let response;
    try {
      response = await employeeService.getAdmins(apiParams);
    } catch (err) {
      if (fetchIdRef.current !== fetchId) return;
      if (!silent) {
        setStatus(STATUS.ERROR);
        setError(err?.message || 'Failed to load employees. Please try again.');
        setIsRefetching(false);
      }
      return;
    }

    if (fetchIdRef.current !== fetchId) return;

    if (response?.success && response.code === 200 && response.data?.admins) {
      const extracted =
        response.data?.total ||
        response.data?.meta?.total ||
        response.data?.count ||
        response.data?.admins_total ||
        response.data?.pagination?.total ||
        response.total ||
        response.meta?.total ||
        0;

      setEmployees(response.data.admins);
      setTotalCount(extracted);
      setStatus(STATUS.SUCCESS);
      setError(null);
      setIsRefetching(false);

      store.setCache(response.data.admins, extracted, paramsKey);
    } else {
      if (!silent) {
        setStatus(STATUS.ERROR);
        setError(response?.error || response?.message || 'Failed to load employees.');
        setIsRefetching(false);
      }
    }
  }, [store, paramsKey]);

  const refetch = useCallback(() => {
    return fetchData({ silent: false });
  }, [fetchData]);

  useEffect(() => {
    mountedRef.current = true;
    const fetchIdRefAtMount = fetchIdRef;

    const cached = store.getCache();
    if (cached && cached.paramsKey === paramsKey && !store.isStale()) {
      setEmployees(cached.employees);
      setTotalCount(cached.totalCount);
      setStatus(STATUS.SUCCESS);
      setError(null);
      return;
    }

    if (cached && cached.paramsKey === paramsKey) {
      setEmployees(cached.employees);
      setTotalCount(cached.totalCount);
    }

    setStatus(STATUS.LOADING);
    fetchData({ silent: false });

    return () => {
      mountedRef.current = false;
      fetchIdRefAtMount.current += 1;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const prevParamsKeyRef = useRef(paramsKey);
  useEffect(() => {
    if (!mountedRef.current) return;
    if (prevParamsKeyRef.current === paramsKey) return;
    prevParamsKeyRef.current = paramsKey;

    const cached = store.getCache();
    if (cached && cached.paramsKey === paramsKey && !store.isStale()) {
      setEmployees(cached.employees);
      setTotalCount(cached.totalCount);
      setStatus(STATUS.SUCCESS);
      setError(null);
      return;
    }

    setStatus(STATUS.LOADING);
    fetchData({ silent: false });
  }, [searchValue, selectedRole, filterStatus, currentPage, pageSize, selectedEmployeeId, fetchData, store, paramsKey]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (statusRef.current !== STATUS.SUCCESS) return;

      const cached = store.getCache();
      const currentKey = JSON.stringify(paramsRef.current);
      if (cached && cached.paramsKey === currentKey && !store.isStale()) return;

      setIsRefetching(true);
      fetchData({ silent: true }).finally(() => {
        if (fetchIdRef.current) setIsRefetching(false);
      });
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchData, store]);

  return {
    status,
    employees,
    totalCount,
    error,
    isRefetching,
    refetch,
    isLoading: status === STATUS.LOADING,
    isError: status === STATUS.ERROR,
    isSuccess: status === STATUS.SUCCESS,
  };
}
