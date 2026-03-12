/**
 * LemonSqueezy API Client
 * https://docs.lemonsqueezy.com/api
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class LemonSqueezyClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.lemonsqueezy.com/v1';
    this.headers = {
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      'Authorization': `Bearer ${apiKey}`
    };
  }

  async getUser() {
    const response = await axios.get(`${this.baseURL}/users/me`, {
      headers: this.headers
    });
    return response.data.data;
  }

  async getStores() {
    const response = await axios.get(`${this.baseURL}/stores`, {
      headers: this.headers
    });
    return response.data.data;
  }

  async createProduct(storeId, data) {
    const payload = {
      data: {
        type: 'products',
        attributes: {
          name: data.name,
          description: data.description || '',
          price: data.price * 100, // Convert to cents
          pay_what_you_want: false,
          buy_now_price: data.price * 100,
          requires_shipping: false,
          status: 'published'
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: storeId
            }
          }
        }
      }
    };

    const response = await axios.post(
      `${this.baseURL}/products`,
      payload,
      { headers: this.headers }
    );

    return response.data.data;
  }

  async createVariant(productId, data) {
    const payload = {
      data: {
        type: 'variants',
        attributes: {
          name: data.name,
          description: data.description || '',
          price: data.price * 100,
          status: 'published'
        },
        relationships: {
          product: {
            data: {
              type: 'products',
              id: productId
            }
          }
        }
      }
    };

    const response = await axios.post(
      `${this.baseURL}/variants`,
      payload,
      { headers: this.headers }
    );

    return response.data.data;
  }

  async uploadFile(productId, filePath) {
    // Step 1: Get signed URL for upload
    const fileName = path.basename(filePath);
    const fileSize = fs.statSync(filePath).size;
    const mimeType = 'application/gzip';

    const signedUrlResponse = await axios.post(
      `${this.baseURL}/files`,
      {
        data: {
          type: 'files',
          attributes: {
            name: fileName,
            size: fileSize,
            mime_type: mimeType
          },
          relationships: {
            product: {
              data: {
                type: 'products',
                id: productId
              }
            }
          }
        }
      },
      { headers: this.headers }
    );

    const fileData = signedUrlResponse.data.data;
    const uploadUrl = fileData.attributes.upload_url;

    // Step 2: Upload file to signed URL
    const fileStream = fs.createReadStream(filePath);
    await axios.put(uploadUrl, fileStream, {
      headers: {
        'Content-Type': mimeType
      }
    });

    return fileData;
  }

  async getProducts(storeId) {
    const response = await axios.get(
      `${this.baseURL}/products?filter[store_id]=${storeId}`,
      { headers: this.headers }
    );
    return response.data.data;
  }

  async updateProduct(productId, data) {
    const payload = {
      data: {
        type: 'products',
        id: productId,
        attributes: data
      }
    };

    const response = await axios.patch(
      `${this.baseURL}/products/${productId}`,
      payload,
      { headers: this.headers }
    );

    return response.data.data;
  }
}

module.exports = LemonSqueezyClient;
