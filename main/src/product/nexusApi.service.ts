import { Injectable } from '@nestjs/common';
import { GoogleAuth } from 'google-auth-library';
import config from 'src/config';
import { HttpService } from '@nestjs/axios';
export type ResyncImageResult = {
  status: 'ok';
  success: boolean;
};

export type UpdateImageResult = {
  status: 'ok';
};

/**
 * Nest service to communicate with Nexus API
 */
@Injectable()
export class NexusApiService {
  constructor(private httpService: HttpService) {}
  async fetchCurrentImagesByModelNumber(
    modelNumber: string,
  ): Promise<string[]> {
    const host = config.nexus.apiHost;
    const url = `${host}/v1/product/${modelNumber}/imageUrls`;

    try {
      const auth = new GoogleAuth();
      console.log(url);
      const client = await auth.getIdTokenClient(host);
      const res = await client.request({ url, method: 'GET' });
      const data = res.data as any;
      const imageUrls = data.data;
      return imageUrls;
    } catch (e) {
      console.log(`Error ${e} occur when fetching image urls from nexus`);
    }
    return [];
  }

  async fetchAllSourceImagesByModelNumber(
    modelNumber: string,
  ): Promise<string[]> {
    const host = config.nexus.apiHost;
    const url = `${host}/v1/product/${modelNumber}/allSourceImageUrls`;

    try {
      const auth = new GoogleAuth();
      console.log(url);
      const client = await auth.getIdTokenClient(host);
      const res = await client.request({ url, method: 'GET' });
      const data = res.data as any;
      const imageUrls = data.data;
      return imageUrls;
    } catch (e) {
      console.log(`Error ${e} occur when fetching image urls from nexus`);
    }
    return [];
  }

  async resyncImagesByModelNumber(
    modelNumber: string,
  ): Promise<ResyncImageResult> {
    const apiHost = config.nexus.apiHost;
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(apiHost);
    const url = `${apiHost}/v1/product/${modelNumber}/syncImages`;
    const res = await client.request<ResyncImageResult>({
      url,
      method: 'POST',
    });
    return res.data;
  }

  async updateImagesByModelNumber(
    modelNumber: string,
    imageUrls: string[],
  ): Promise<UpdateImageResult> {
    const apiHost = config.nexus.apiHost;
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(apiHost);
    const url = `${apiHost}/v1/product/${modelNumber}/updateImages`;
    const res = await client.request<UpdateImageResult>({
      url,
      method: 'POST',
      data: imageUrls,
    });
    return res.data;
  }

  async uploadImagesByModelNumber(
    modelNumber: string,
    data,
    httpConfig = { headers: {} },
  ): Promise<any> {
    const apiHost = config.nexus.apiHost;
    const auth = new GoogleAuth({});
    const client = await auth.getIdTokenClient(apiHost);
    const url = `${apiHost}/v1/product/${modelNumber}/uploadImages`;
    const token = (await client.getRequestHeaders()).Authorization;
    const headers = {
      'Content-Type': `multipart/form-data`,
      Authorization: token,
    };
    const response = await this.httpService.axiosRef.post(
      url,
      data,
      Object.assign({}, httpConfig, {
        headers: Object.assign({}, headers, {
          ...data.getHeaders(),
          'Content-Length': data.getLengthSync().toString(),
          Authorization: token,
        }),
      }),
    );
    return response.data;
  }
}
