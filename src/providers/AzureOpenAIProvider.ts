/* eslint-disable @typescript-eslint/no-explicit-any */
// Corrected import path for types
import { AIProviderType, AIProvider, AIRequest, AIResponse } from '../types';
import Configuration from '../Configuration';
import axios from 'axios';

export default class AzureOpenAIProvider implements AIProvider {
  // Add the required 'type' property
  public readonly type: AIProviderType = { name: 'openai' }; // Using name based on AIProviderManager usage
  private config: Configuration;
  constructor(config: Configuration) {
    this.config = config;
  }
  async processRequest(request: AIRequest): Promise<AIResponse> {
    const { prompt, maxTokens = 2000, temperature = 0 } = request;
    const messages = [{ role: 'user', content: prompt }];
    return this.makeAzureOpenAIRequest(messages, { maxTokens, temperature });
  }

  async generateResponse(prompt: string): Promise<string> {
    const response = await this.processRequest({ prompt });
    return response.response;
  }

  private async makeAzureOpenAIRequest(messages: any[], options = {
    maxTokens: 2000,
    temperature: 0
  }): Promise<AIResponse> {
    try {
      const endpoint = `https://${this.config.getAzureOpenaiEndpoint()}.openai.azure.com`;
      const deploymentId = this.config.getAzureOpenaiDeploymentName();
      const apiVersion = '2024-02-15-preview';
      const apiKey = this.config.getAzureOpenaiApiKey();
      const url = `${endpoint}/openai/deployments/${deploymentId}/chat/completions?api-version=${apiVersion}`;

      const requestData = {
        messages: messages,
        max_tokens: options.maxTokens,
        temperature: options.temperature
      };

      const response = await axios({
        method: 'post',
        url: url,
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        },
        data: requestData
      });

      // Using 'any' to bypass potential type inference issues
      const responseData = response.data as any;
      const responseText = responseData?.choices?.[0]?.message?.content || '';
      const usageData = responseData?.usage || { total_tokens: 0 }; // Default usage if not present

      return {
        response: responseText,
        // Map usage data if available, otherwise provide default
        usage: {
          total: usageData.total_tokens,
          available: 0, // Azure usage typically doesn't provide 'available'
          reset: 0      // Azure usage typically doesn't provide 'reset'
        }
      };
    } catch (error) {
      console.error('Error in makeAzureOpenAIRequest:', error);
      throw error;
    }
  }

  async chat(messages: any, options: any = {}): Promise<any> {
    return await this.makeAzureOpenAIRequest(messages, options);
  }

  toJSON(): object {
    return {
      type: 'AzureOpenAIProvider'
    };
  }
}