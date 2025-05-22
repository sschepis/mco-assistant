/* eslint-disable @typescript-eslint/no-explicit-any */
// Corrected import path for types
import { AIProviderType, AIProvider, AIRequest, AIResponse } from '../types';
import Configuration from '../Configuration';
import axios from 'axios';
import { execPromise } from '../utils';

export default class MetaProvider implements AIProvider {
  // Add the required 'type' property
  public readonly type: AIProviderType = { name: 'meta' }; // Using name based on AIProviderManager usage
  private config: Configuration;
  constructor(config: Configuration) {
    this.config = config;
  }
  async processRequest(request: AIRequest): Promise<AIResponse> {
    const { prompt, maxTokens = 2000, temperature = 0 } = request;
    const messages = [{ role: 'user', content: prompt }];
    return this.makeLlama31Request(messages, { maxTokens, temperature });
  }

  async generateResponse(prompt: string): Promise<string> {
    const response = await this.processRequest({ prompt });
    return response.response;
  }

  private async makeLlama31Request(messages: any[], options = {
    maxTokens: 2000,
    temperature: 0
  }): Promise<AIResponse> {
    try {
      const { stdout: token } = await execPromise('gcloud auth print-access-token');
      const authToken = token.trim();
      const ENDPOINT = this.config.getLlamaEndpoint() || 'us-central1-aiplatform.googleapis.com';
      const PROJECT_ID = this.config.getGcloudProjectId();
      const REGION = this.config.getGcloudRegion() || 'us-central1';
      const url = `https://${ENDPOINT}/v1beta1/projects/${PROJECT_ID}/locations/${REGION}/endpoints/openapi/chat/completions`;

      const requestData = {
        model: "meta/llama3-405b-instruct-maas",
        messages: messages.map((m: any) => ({
          role: m.role,
          content: m.content
        })),
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        stream: false
      };

      const response = await axios({
        method: 'post',
        url: url,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: requestData
      });

      // Using 'any' to bypass potential type inference issues
      const responseData = response.data as any;
      const responseText = responseData?.choices?.[0]?.message?.content || '';
      return {
        response: responseText,
        usage: {
          total: responseText.length,
          available: responseText.length, // Assuming available is same as total for now
          reset: 0
        }
      };
    } catch (error) {
      console.error('Error in makeLlama31Request:', error);
      throw error;
    }
  }

  async chat(messages: any, options: any = {}): Promise<any> {
    return await this.makeLlama31Request(messages, options);
  }

  toJSON(): object {
    return {
      name: 'MetaProvider'
    };
  }
}