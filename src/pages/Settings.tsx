import { useState } from 'react';
import { PageContainer, SectionHeader } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  Eye, 
  EyeOff, 
  TestTube, 
  Copy,
  Trash2,
  Plus,
  Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Mock data
const mockApiKeys = [
  { id: 'key-1', name: '正式環境 API', prefix: 'oc_prod_', created: '2024-01-15', lastUsed: '2024-01-20' },
  { id: 'key-2', name: '開發環境', prefix: 'oc_dev_', created: '2024-01-10', lastUsed: '2024-01-19' },
];

const mockRoles = [
  { id: 'role-1', name: '管理員', users: 2, permissions: '完整存取權限' },
  { id: 'role-2', name: '操作員', users: 5, permissions: '執行任務、檢視日誌' },
  { id: 'role-3', name: '檢視者', users: 10, permissions: '唯讀權限' },
];

export default function Settings() {
  const { toast } = useToast();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const handleSave = () => {
    toast({ description: '設定已儲存成功' });
  };

  const handleTestConnection = (service: string) => {
    toast({ description: `正在測試 ${service} 連線...` });
    setTimeout(() => {
      toast({ description: `${service} 連線成功！` });
    }, 1000);
  };

  return (
    <PageContainer>
      <SectionHeader
        title="設定"
        description="配置您的 OpenClaw 任務面板"
        icon="⚙️"
      />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1">
          <TabsTrigger value="general" className="py-2">一般設定</TabsTrigger>
          <TabsTrigger value="integrations" className="py-2">整合</TabsTrigger>
          <TabsTrigger value="notifications" className="py-2">通知</TabsTrigger>
          <TabsTrigger value="access" className="py-2">角色與權限</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>一般設定</CardTitle>
              <CardDescription>任務面板的基本設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="system-name">系統名稱</Label>
                  <Input id="system-name" defaultValue="Openclaw 正式環境" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">時區</Label>
                  <Select defaultValue="Asia/Taipei">
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">美國/紐約</SelectItem>
                      <SelectItem value="America/Los_Angeles">美國/洛杉磯</SelectItem>
                      <SelectItem value="Europe/London">歐洲/倫敦</SelectItem>
                      <SelectItem value="Asia/Tokyo">亞洲/東京</SelectItem>
                      <SelectItem value="Asia/Taipei">亞洲/台北</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retention">日誌保留天數</Label>
                <Input id="retention" type="number" defaultValue="30" className="w-32" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>深色模式</Label>
                  <p className="text-sm text-muted-foreground">啟用深色主題</p>
                </div>
                <Switch />
              </div>

              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                儲存變更
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-6">
          {/* Webhook URL */}
          <Card>
            <CardHeader>
              <CardTitle>Webhook URL</CardTitle>
              <CardDescription>接收 Webhook 觸發的端點</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Input 
                  readOnly 
                  value="https://api.openclaw.io/webhook/abc123xyz" 
                  className="font-mono text-sm"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText('https://api.openclaw.io/webhook/abc123xyz');
                    toast({ description: 'URL 已複製' });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" onClick={() => handleTestConnection('Webhook')}>
                <TestTube className="h-4 w-4 mr-2" />
                測試 Webhook
              </Button>
            </CardContent>
          </Card>

          {/* API Keys */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>API 金鑰</CardTitle>
                <CardDescription>管理 API 存取金鑰</CardDescription>
              </div>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                建立金鑰
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名稱</TableHead>
                      <TableHead>金鑰</TableHead>
                      <TableHead className="hidden sm:table-cell">建立日期</TableHead>
                      <TableHead className="hidden sm:table-cell">最後使用</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockApiKeys.map(key => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-sm">
                              {showKeys[key.id] 
                                ? `${key.prefix}••••••••••••••••` 
                                : `${key.prefix}••••••••`}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => setShowKeys(prev => ({ ...prev, [key.id]: !prev[key.id] }))}
                            >
                              {showKeys[key.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {key.created}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {key.lastUsed}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* External Connections */}
          <Card>
            <CardHeader>
              <CardTitle>外部連線</CardTitle>
              <CardDescription>連接外部服務</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <span className="text-lg font-bold">n8n</span>
                  </div>
                  <div>
                    <p className="font-medium">n8n 工作流程</p>
                    <p className="text-sm text-muted-foreground">連接 n8n 以使用進階工作流程</p>
                  </div>
                </div>
                <Badge variant="outline">未連線</Badge>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-success/10 text-success flex items-center justify-center">
                    <span className="text-lg font-bold">S</span>
                  </div>
                  <div>
                    <p className="font-medium">Supabase</p>
                    <p className="text-sm text-muted-foreground">資料庫和驗證服務</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-success text-success">可連線</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>通知管道</CardTitle>
              <CardDescription>設定接收警報的方式</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">電子郵件通知</p>
                  <p className="text-sm text-muted-foreground">透過電子郵件接收警報</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">LINE Notify</p>
                  <p className="text-sm text-muted-foreground">推送通知至 LINE</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Slack Webhook</p>
                  <p className="text-sm text-muted-foreground">發送警報至 Slack 頻道</p>
                </div>
                <Switch />
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-4">警報設定</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">任務失敗</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">佇列積壓</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">系統健康狀態</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">每日摘要</span>
                    <Switch />
                  </div>
                </div>
              </div>

              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                儲存變更
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Role & Access */}
        <TabsContent value="access">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>角色與權限</CardTitle>
                <CardDescription>管理團隊的存取控制</CardDescription>
              </div>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                建立角色
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>角色</TableHead>
                      <TableHead>使用者</TableHead>
                      <TableHead className="hidden sm:table-cell">權限</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockRoles.map(role => (
                      <TableRow key={role.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{role.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{role.users}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {role.permissions}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">編輯</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <p className="text-sm text-muted-foreground mt-4">
                注意：這是 UI 預覽。驗證和存取控制需要後端整合。
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
