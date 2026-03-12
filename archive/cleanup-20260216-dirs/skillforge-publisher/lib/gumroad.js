/**
 * Gumroad API Client
 * https://gumroad.com/api
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class GumroadClient {
  constructor(token) {
    this.token = token;
    this.baseURL = 'https://api.gumroad.com/v2';
  }

  async getUser() {
    const response = await axios.get(`${this.baseURL}/user`, {
      params: { access_token: this.token }
    });
    return response.data.user;
  }

  async createProduct(data) {
    const form = new FormData();
    form.append('access_token', this.token);
    
    // Required fields
    form.append('name', data.name);
    form.append('price', data.price);
    
    // Optional fields
    if (data.description) form.append('description', data.description);
    if (data.customizable_price) form.append('customizable_price', data.customizable_price);
    if (data.require_shipping) form.append('require_shipping', data.require_shipping);
    if (data.max_purchase_count) form.append('max_purchase_count', data.max_purchase_count);
    if (data.tweet) form.append('tweet', data.tweet);
    
    const response = await axios.post(`${this.baseURL}/products`, form, {
      headers: form.getHeaders()
    });
    
    return response.data.product;
  }

  async updateProduct(productId, data) {
    const form = new FormData();
    form.append('access_token', this.token);
    
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        form.append(key, data[key]);
      }
    });

    const response = await axios.put(
      `${this.baseURL}/products/${productId}`,
      form,
      { headers: form.getHeaders() }
    );
    
    return response.data.product;
  }

  async uploadFile(productId, filePath) {
    const form = new FormData();
    form.append('access_token', this.token);
    form.append('file', fs.createReadStream(filePath));

    const response = await axios.post(
      `${this.baseURL}/products/${productId}/files`,
      form,
      { headers: form.getHeaders() }
    );
    
    return response.data.file;
  }

  async createVariant(productId, data) {
    const form = new FormData();
    form.append('access_token', this.token);
    form.append('name', data.name);
    form.append('price_difference', data.priceDifference);
    
    if (data.max_purchase_count) {
      form.append('max_purchase_count', data.max_purchase_count);
    }

    const response = await axios.post(
      `${this.baseURL}/products/${productId}/variants`,
      form,
      { headers: form.getHeaders() }
    );
    
    return response.data.variant;
  }

  async enableVariants(productId) {
    return this.updateProduct(productId, {
      variants_enabled: true
    });
  }

  async getProducts() {
    const response = await axios.get(`${this.baseURL}/products`, {
      params: { access_token: this.token }
    });
    return response.data.products;
  }

  async deleteProduct(productId) {
    const response = await axios.delete(
      `${this.baseURL}/products/${productId}`,
      { params: { access_token: this.token } }
    );
    return response.data.message;
  }
}

module.exports = GumroadClient;
