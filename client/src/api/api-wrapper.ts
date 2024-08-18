import axios, { AxiosRequestConfig } from "axios";
import { DEFAULT_API_CONFIG } from "./api-config";
import * as Types from "./api-types";

export const API = axios.create({
  baseURL: DEFAULT_API_CONFIG.url,
  timeout: DEFAULT_API_CONFIG.timeout,
  withCredentials: true,
});

export const getFetch = async <T>(
  url: string,
  params?: Types.KeyValuePairs,
  config?: AxiosRequestConfig
): Promise<Types.FetchResponse<T>> => {
  try {
    const response = await API.get(url, {
      params,
      ...config,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const postFetch = async <T>(
  url: string,
  params?: Types.KeyValuePairs,
  config?: AxiosRequestConfig
): Promise<Types.FetchResponse<T>> => {
  try {
    const response = await API.post(url, params, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};
