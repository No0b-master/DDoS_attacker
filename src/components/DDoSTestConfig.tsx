
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ShieldAlert, Zap, ZapOff } from 'lucide-react';

interface TestConfig {
  url: string;
  method: string;
  requestCount: number;
  concurrency: number;
  payload: string;
  authToken: string;
  headers: string;
}

interface TestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  startTime: Date;
  endTime?: Date;
  isRunning: boolean;
}

const DDoSTestConfig = () => {
  const [config, setConfig] = useState<TestConfig>({
    url: '',
    method: 'GET',
    requestCount: 100,
    concurrency: 10,
    payload: '',
    authToken: '',
    headers: ''
  });

  const [result, setResult] = useState<TestResult | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const parseHeaders = (headersString: string) => {
    const headers: Record<string, string> = {};
    if (headersString.trim()) {
      headersString.split('\n').forEach(header => {
        const [key, value] = header.split(':').map(s => s.trim());
        if (key && value) {
          headers[key] = value;
        }
      });
    }
    if (config.authToken) {
      headers['Authorization'] = config.authToken.startsWith('Bearer ') 
        ? config.authToken 
        : `Bearer ${config.authToken}`;
    }
    return headers;
  };

  const makeRequest = async () => {
    const headers = parseHeaders(config.headers);
    const requestOptions: RequestInit = {
      method: config.method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (config.method !== 'GET' && config.payload) {
      requestOptions.body = config.payload;
    }

    const startTime = performance.now();
    try {
      const response = await fetch(config.url, requestOptions);
      const endTime = performance.now();
      return {
        success: true,
        status: response.status,
        responseTime: endTime - startTime
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: endTime - startTime
      };
    }
  };

  const runTest = async () => {
    if (!config.url) {
      addLog('Error: URL is required');
      return;
    }

    const testResult: TestResult = {
      totalRequests: config.requestCount,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      startTime: new Date(),
      isRunning: true
    };

    setResult(testResult);
    setCurrentProgress(0);
    setLogs([]);
    addLog(`Starting DDoS test on ${config.url}`);
    addLog(`Configuration: ${config.requestCount} requests, ${config.concurrency} concurrent`);

    const responseTimes: number[] = [];
    const batchSize = config.concurrency;
    const totalBatches = Math.ceil(config.requestCount / batchSize);

    for (let batch = 0; batch < totalBatches; batch++) {
      const requestsInBatch = Math.min(batchSize, config.requestCount - batch * batchSize);
      const batchPromises = Array(requestsInBatch).fill(0).map(() => makeRequest());
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              testResult.successfulRequests++;
            } else {
              testResult.failedRequests++;
            }
            responseTimes.push(result.value.responseTime);
          } else {
            testResult.failedRequests++;
          }
        });

        const progress = ((batch + 1) / totalBatches) * 100;
        setCurrentProgress(progress);
        addLog(`Batch ${batch + 1}/${totalBatches} completed - Success: ${testResult.successfulRequests}, Failed: ${testResult.failedRequests}`);
        
        setResult({ ...testResult });
        
        // Small delay between batches to prevent overwhelming
        if (batch < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        addLog(`Batch ${batch + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    testResult.endTime = new Date();
    testResult.isRunning = false;
    testResult.averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    setResult(testResult);
    addLog('Test completed');
    addLog(`Results: ${testResult.successfulRequests} successful, ${testResult.failedRequests} failed`);
    addLog(`Average response time: ${testResult.averageResponseTime.toFixed(2)}ms`);
  };

  const stopTest = () => {
    if (result) {
      setResult({ ...result, isRunning: false });
      addLog('Test stopped by user');
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3">
          <ShieldAlert className="text-blue-600" size={40} />
          Rapid Fire Assault : <span className='text-red-600'>A DDoS Attacker Tool</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Test your API's resilience against high-volume requests
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap size={20} />
              Test Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="url">Target URL *</Label>
              <Input
                id="url"
                placeholder="https://api.example.com/endpoint"
                value={config.url}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="method">HTTP Method</Label>
                <Select value={config.method} onValueChange={(value) => setConfig({ ...config, method: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="requestCount">Total Requests</Label>
                <Input
                  id="requestCount"
                  type="number"
                  min="1"
                  max="10000"
                  value={config.requestCount}
                  onChange={(e) => setConfig({ ...config, requestCount: parseInt(e.target.value) || 100 })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="concurrency">Concurrent Requests</Label>
              <Input
                id="concurrency"
                type="number"
                min="1"
                max="100"
                value={config.concurrency}
                onChange={(e) => setConfig({ ...config, concurrency: parseInt(e.target.value) || 10 })}
              />
            </div>

            <div>
              <Label htmlFor="authToken">Authorization Token (Optional)</Label>
              <Input
                id="authToken"
                placeholder="Bearer token or just the token value"
                value={config.authToken}
                onChange={(e) => setConfig({ ...config, authToken: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="headers">Custom Headers (Optional)</Label>
              <Textarea
                id="headers"
                placeholder="Key: Value&#10;Another-Header: Another Value"
                rows={3}
                value={config.headers}
                onChange={(e) => setConfig({ ...config, headers: e.target.value })}
              />
            </div>

            {config.method !== 'GET' && (
              <div>
                <Label htmlFor="payload">Request Payload (JSON)</Label>
                <Textarea
                  id="payload"
                  placeholder='{"key": "value", "data": "test"}'
                  rows={4}
                  value={config.payload}
                  onChange={(e) => setConfig({ ...config, payload: e.target.value })}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={runTest} 
                disabled={result?.isRunning || !config.url}
                className="flex-1"
              >
                {result?.isRunning ? (
                  <>
                    <ZapOff className="mr-2" size={16} />
                    Running Test...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2" size={16} />
                    Start Test
                  </>
                )}
              </Button>
              {result?.isRunning && (
                <Button onClick={stopTest} variant="destructive">
                  Stop
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Test Results
                  <Badge variant={result.isRunning ? "default" : "secondary"}>
                    {result.isRunning ? "Running" : "Completed"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Progress:</span>
                    <span>{currentProgress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${currentProgress}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-green-600 font-semibold">
                        Successful: {result.successfulRequests}
                      </div>
                      <div className="text-red-600 font-semibold">
                        Failed: {result.failedRequests}
                      </div>
                    </div>
                    <div>
                      <div>Total: {result.totalRequests}</div>
                      <div>Avg Response: {result.averageResponseTime.toFixed(2)}ms</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Test Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-3 rounded-md h-64 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No logs yet. Start a test to see activity.</p>
                ) : (
                  <div className="space-y-1">
                    {logs.map((log, index) => (
                      <div key={index} className="text-sm font-mono text-gray-700">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> This tool is designed for testing your own APIs or APIs you have explicit permission to test. 
          Unauthorized testing of third-party services may violate terms of service or local laws. Use responsibly.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default DDoSTestConfig;
