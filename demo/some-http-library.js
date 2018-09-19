// @flow

type MyResponse = {
    status: number
};

export const httpGet = (path: string): Promise<MyResponse> =>
    Promise.resolve({ status: 200 });
