export type AppFetchRequestResponseItem<T> = {
  data: T;
  success?: boolean;
  msg?: string;
};

export type AppFetchRequestResponse<T> = AppFetchRequestResponseItem<T>;

export type FetchResponse<T> = AppFetchRequestResponse<T>;
export type KeyValuePairs<T = string | number | number[] | object[] | unknown> =
  Record<string, T> | FormData;
