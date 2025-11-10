import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Eye, EyeOff, ChevronDown, ChevronUp, Plus, Trash2, LogOut, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface McpServer {
  id: string;
  type: string;
  name: string;
  apiKey: string;
  isConnected: boolean;
  isTesting?: boolean;
  serverId?: string;
}

interface McpTool {
  name: string;
  description: string;
  mcpType: string;
  input_schema?: any;
}

interface ServerTools {
  [serverId: string]: {
    enabled: string[];
  };
}

const DEFAULT_CANVAS_TOOLS: McpTool[] = [
  {
    name: "list_upcoming_assignments",
    description: "List upcoming assignments from Canvas for the next few weeks.",
    mcpType: "canvas"
  },
  {
    name: "get_course_materials",
    description: "Retrieve modules, files, and other course content from Canvas.",
    mcpType: "canvas"
  },
  {
    name: "get_assignment_details",
    description: "Fetch due dates, instructions, and submission info for a specific assignment.",
    mcpType: "canvas"
  }
];

const MCP_SERVER_TYPES = [
  { value: "google_drive", label: "Google Drive", placeholder: "OAuth token or API key" },
  { value: "github", label: "GitHub", placeholder: "Personal access token" },
  { value: "notion", label: "Notion", placeholder: "Integration token" },
  { value: "slack", label: "Slack", placeholder: "Bot token" },
  { value: "custom", label: "Custom MCP Server", placeholder: "API key or token" },
];

const Connections = () => {
  const [university, setUniversity] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [expandedServers, setExpandedServers] = useState<Record<string, boolean>>({});
  const [availableTools, setAvailableTools] = useState<McpTool[]>([]);
  const [enabledTools, setEnabledTools] = useState<ServerTools>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load existing connection from localStorage
  useEffect(() => {
    const connected = localStorage.getItem("astar_connected") === "true";
    const storedUniversity = localStorage.getItem("astar_university");
    const storedToken = localStorage.getItem("astar_api_token");
    const storedCustomUrl = localStorage.getItem("astar_custom_url");

    if (connected && storedUniversity && storedToken) {
      setIsConnected(true);
      setUniversity(storedUniversity);
      setApiToken(storedToken);
      if (storedCustomUrl) {
        setCustomUrl(storedCustomUrl);
      }
    }

    // Load MCP servers from localStorage
    const storedMcpServers = localStorage.getItem("astar_mcp_servers");
    if (storedMcpServers) {
      try {
        const servers = JSON.parse(storedMcpServers);
        // Reset testing state on load (in case page was refreshed during test)
        const serversWithResetTesting = servers.map((s: McpServer) => ({
          ...s,
          isTesting: false
        }));
        setMcpServers(serversWithResetTesting);
        localStorage.setItem("astar_mcp_servers", JSON.stringify(serversWithResetTesting));
      } catch (error) {
        console.error("Failed to load MCP servers:", error);
      }
    }

    // Load enabled tools from localStorage
    const storedEnabledTools = localStorage.getItem("astar_mcp_enabled_tools");
    if (storedEnabledTools) {
      try {
        setEnabledTools(JSON.parse(storedEnabledTools));
      } catch (error) {
        console.error("Failed to load enabled tools:", error);
      }
    }

    // Fetch available tools
    fetchAvailableTools();
  }, []);

  // Fetch tools when connected servers change
  useEffect(() => {
    const connectedServers = mcpServers.filter(s => s.isConnected && s.serverId);
    if (connectedServers.length > 0) {
      fetchAvailableTools();
    }
  }, [mcpServers]);

  const fetchAvailableTools = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/mcp/tools`);
      const result = await response.json();
      
      if (result.success) {
        setAvailableTools(result.tools || []);
      }
    } catch (error) {
      console.error("Failed to fetch tools:", error);
    }
  };

  const toggleTool = (serverId: string, toolName: string) => {
    setEnabledTools(prev => {
      const serverTools = prev[serverId] || { enabled: [] };
      const isEnabled = serverTools.enabled.includes(toolName);
      
      const updated = {
        ...prev,
        [serverId]: {
          enabled: isEnabled
            ? serverTools.enabled.filter(t => t !== toolName)
            : [...serverTools.enabled, toolName]
        }
      };
      
      // Save to localStorage
      localStorage.setItem("astar_mcp_enabled_tools", JSON.stringify(updated));
      return updated;
    });
  };

  const handleTestConnection = () => {
    if (!university || !apiToken || (university === "custom" && !customUrl)) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // Simulate connection test
    setTimeout(() => {
      setIsConnected(true);
      fetchAvailableTools();
      toast({
        title: "Connection Successful",
        description: "Your Canvas account is now connected",
      });
    }, 1000);
  };

  const handleSave = () => {
    if (isConnected) {
      // Save to localStorage
      localStorage.setItem("astar_connected", "true");
      localStorage.setItem("astar_university", university);
      localStorage.setItem("astar_api_token", apiToken);
      if (university === "custom") {
        localStorage.setItem("astar_custom_url", customUrl);
      }
      
      toast({
        title: "Settings Saved",
        description: "Your connection settings have been updated",
      });
    } else {
      toast({
        title: "Test Connection First",
        description: "Please test your connection before saving",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = () => {
    // Clear localStorage
    localStorage.removeItem("astar_connected");
    localStorage.removeItem("astar_university");
    localStorage.removeItem("astar_api_token");
    localStorage.removeItem("astar_custom_url");
    
    toast({
      title: "Disconnected",
      description: "You have been disconnected from Canvas",
    });
    
    // Redirect to onboarding
    setTimeout(() => {
      navigate("/onboarding");
    }, 1000);
  };

  const handleAddMcpServer = () => {
    const newServer: McpServer = {
      id: Date.now().toString(),
      type: "",
      name: "",
      apiKey: "",
      isConnected: false,
    };
    const updatedServers = [...mcpServers, newServer];
    setMcpServers(updatedServers);
    // Expand the new server by default
    setExpandedServers(prev => ({ ...prev, [newServer.id]: true }));
    // Save to localStorage
    localStorage.setItem("astar_mcp_servers", JSON.stringify(updatedServers));
  };

  const toggleServerExpansion = (id: string) => {
    setExpandedServers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRemoveMcpServer = (id: string) => {
    const updatedServers = mcpServers.filter(server => server.id !== id);
    setMcpServers(updatedServers);
    // Save to localStorage
    localStorage.setItem("astar_mcp_servers", JSON.stringify(updatedServers));
    toast({
      title: "Server Removed",
      description: "MCP server connection has been removed",
    });
  };

  const handleUpdateMcpServer = (id: string, field: keyof McpServer, value: string) => {
    const updatedServers = mcpServers.map(server => 
      server.id === id ? { ...server, [field]: value } : server
    );
    setMcpServers(updatedServers);
    // Save to localStorage
    localStorage.setItem("astar_mcp_servers", JSON.stringify(updatedServers));
  };

  const handleTestMcpConnection = async (id: string) => {
    const server = mcpServers.find(s => s.id === id);
    if (!server?.type || !server?.apiKey) {
      toast({
        title: "Missing Information",
        description: "Please select a server type and enter credentials",
        variant: "destructive",
      });
      return;
    }

    // Set testing state
    const updatedServersTesting = mcpServers.map(s => 
      s.id === id ? { ...s, isTesting: true } : s
    );
    setMcpServers(updatedServersTesting);
    localStorage.setItem("astar_mcp_servers", JSON.stringify(updatedServersTesting));

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      let serverId: string | null = null;
      
      // Step 1: Check if server already exists in backend
      const listResponse = await fetch(`${API_URL}/api/mcp/servers`);
      const listResult = await listResponse.json();
      
      if (listResult.success && listResult.servers) {
        // Look for existing server by type and name
        const existingServer = listResult.servers.find((s: any) => 
          s.type === server.type
        );
        
        if (existingServer) {
          serverId = existingServer.id;
          // Update existing server with new credentials
          const updateResponse = await fetch(`${API_URL}/api/mcp/servers/${serverId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              apiKey: server.apiKey,
              name: server.name || `${server.type} Connection`,
            }),
          });
          
          const updateResult = await updateResponse.json();
          if (!updateResult.success) {
            throw new Error(updateResult.error || 'Failed to update server');
          }
        }
      }
      
      // Step 2: Create server if it doesn't exist
      if (!serverId) {
        const createResponse = await fetch(`${API_URL}/api/mcp/servers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: server.type,
            name: server.name || `${server.type} Connection`,
            apiKey: server.apiKey,
          }),
        });

        const createResult = await createResponse.json();
        
        if (!createResult.success) {
          throw new Error(createResult.error || 'Failed to create server');
        }
        
        serverId = createResult.server.id;
      }

      // Step 3: Actually test the connection using the test endpoint
      if (!serverId) {
        throw new Error('Server ID not found after creation');
      }
      
      const testResponse = await fetch(`${API_URL}/api/mcp/servers/${serverId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const testResult = await testResponse.json();

      if (testResult.success) {
        // Update local state with server ID and connection status
        const updatedServers = mcpServers.map(s => 
          s.id === id ? { ...s, isConnected: true, isTesting: false, serverId: serverId } : s
        );
        setMcpServers(updatedServers);
        // Save to localStorage
        localStorage.setItem("astar_mcp_servers", JSON.stringify(updatedServers));
        
        // Fetch tools and initialize enabled tools for this server (all enabled by default)
        if (serverId) {
          // Fetch latest tools
          const toolsResponse = await fetch(`${API_URL}/api/mcp/tools`);
          const toolsResult = await toolsResponse.json();
          
          if (toolsResult.success) {
            const tools = toolsResult.tools || [];
            setAvailableTools(tools);
            
            // Initialize enabled tools (all enabled by default)
            setEnabledTools(prev => {
              if (!prev[serverId]) {
                const serverTools = tools
                  .filter(tool => tool.mcpType === server.type)
                  .map(tool => tool.name);
                
                const updated = {
                  ...prev,
                  [serverId]: { enabled: serverTools }
                };
                localStorage.setItem("astar_mcp_enabled_tools", JSON.stringify(updated));
                return updated;
              }
              return prev;
            });
          }
        }
        
        toast({
          title: "Connection Successful",
          description: testResult.message || `${server.type} is now connected and tested successfully`,
        });
      } else {
        // Test failed
        const updatedServers = mcpServers.map(s => 
          s.id === id ? { ...s, isConnected: false, isTesting: false } : s
        );
        setMcpServers(updatedServers);
        localStorage.setItem("astar_mcp_servers", JSON.stringify(updatedServers));
        
        toast({
          title: "Connection Test Failed",
          description: testResult.error || "Could not connect to the MCP server. Please check your credentials.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('MCP connection error:', error);
      const updatedServers = mcpServers.map(s => 
        s.id === id ? { ...s, isConnected: false, isTesting: false } : s
      );
      setMcpServers(updatedServers);
      localStorage.setItem("astar_mcp_servers", JSON.stringify(updatedServers));
      
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Could not connect to backend",
        variant: "destructive",
      });
    }
  };

  const toggleShowToken = (id: string) => {
    setShowTokens(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen pb-20">
        {/* Header */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-3xl font-bold mb-2">Connections</h1>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Canvas Connection */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-semibold text-foreground">Canvas LMS</h2>
          {/* Connection Status */}
          <div className="flex items-center gap-3 pb-6 border-b border-border">
            {isConnected ? (
              <>
                <CheckCircle className="w-6 h-6 text-primary" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Connected</p>
                  <p className="text-sm text-muted-foreground">
                    Last synced: Just now
                  </p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="w-6 h-6 text-destructive" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Not Connected</p>
                  <p className="text-sm text-muted-foreground">
                    Configure your Canvas connection below
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="university">University</Label>
              <Select value={university} onValueChange={setUniversity}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select your university" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="canvas">Canvas.instructure.com</SelectItem>
                  <SelectItem value="custom">Custom Domain</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Show custom URL input when Custom Domain is selected */}
            {university === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="customUrl">Custom Canvas URL</Label>
                <Input
                  id="customUrl"
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="e.g., yourschool.instructure.com"
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Enter your university's Canvas domain
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="apiToken">Canvas API Token</Label>
              <div className="relative">
                <Input
                  id="apiToken"
                  type={showToken ? "text" : "password"}
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Enter your API token"
                  className="bg-background pr-10"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="w-full px-4 py-3 flex items-center justify-between bg-muted hover:bg-muted/70 transition-colors"
              >
                <span className="text-sm font-medium">
                  How to get your API token
                </span>
                {showInstructions ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {showInstructions && (
                <div className="px-4 py-3 space-y-2 text-sm text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Log in to your Canvas account</li>
                    <li>Go to Account → Settings</li>
                    <li>Scroll to "Approved Integrations"</li>
                    <li>Click "+ New Access Token"</li>
                    <li>Give it a purpose (e.g., "ASTAR")</li>
                    <li>Copy the token and paste it above</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Canvas Tools */}
            {isConnected && (
              <div className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Available Canvas Tools</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(availableTools.filter(tool => tool.mcpType === "canvas").length > 0
                    ? availableTools.filter(tool => tool.mcpType === "canvas")
                    : DEFAULT_CANVAS_TOOLS)
                    .map(tool => (
                      <Tooltip key={tool.name}>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground cursor-default hover:border-foreground/20 transition-colors">
                            {tool.name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-sm">{tool.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                </div>
                {availableTools.filter(tool => tool.mcpType === "canvas").length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Showing default Canvas tools. Connect your Canvas account or refresh to load live tools from the server.
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleTestConnection}
                variant="outline"
                className="flex-1"
              >
                Test Connection
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-gradient-primary text-white shadow-glow hover:shadow-lg hover:scale-105 transition-all"
              >
                Save Changes
              </Button>
            </div>

            {/* Disconnect Button - only show when connected */}
            {isConnected && (
              <div className="pt-4 border-t border-border">
                <Button
                  onClick={handleDisconnect}
                  variant="outline"
                  className="w-full text-destructive border-destructive hover:bg-destructive hover:text-white"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Disconnect Canvas
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* MCP Servers Section */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">MCP Servers</h2>
            <Button
              onClick={handleAddMcpServer}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Server
            </Button>
          </div>

          {mcpServers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No MCP servers connected yet.</p>
              <p className="text-sm mt-1">Click "Add Server" to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mcpServers.map((server) => {
                const isExpanded = expandedServers[server.id] ?? false;
                return (
                <div
                  key={server.id}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  {/* Header - Always visible */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => toggleServerExpansion(server.id)}
                        className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity"
                      >
                        {server.isConnected ? (
                          <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">
                              {server.type ? MCP_SERVER_TYPES.find(t => t.value === server.type)?.label : "New Server"}
                            </p>
                            {/* Status indicator light */}
                            <div
                              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                server.isTesting
                                  ? 'bg-orange-500 animate-pulse'
                                  : server.isConnected
                                  ? 'bg-primary'
                                  : 'bg-red-500'
                              }`}
                              title={
                                server.isTesting
                                  ? 'Testing connection...'
                                  : server.isConnected
                                  ? 'Connected'
                                  : 'Not connected'
                              }
                            />
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {server.isTesting
                              ? 'Testing...'
                              : server.isConnected
                              ? 'Connected'
                              : 'Not connected'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveMcpServer(server.id);
                        }}
                        className="text-destructive hover:text-destructive flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expandable content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
                    <div className="space-y-2">
                      <Label>Server Type</Label>
                      <Select
                        value={server.type}
                        onValueChange={(value) => handleUpdateMcpServer(server.id, "type", value)}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select server type" />
                        </SelectTrigger>
                        <SelectContent>
                          {MCP_SERVER_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {server.type && (
                      <>
                        <div className="space-y-2">
                          <Label>Connection Name (Optional)</Label>
                          <Input
                            value={server.name}
                            onChange={(e) => handleUpdateMcpServer(server.id, "name", e.target.value)}
                            placeholder={`My ${MCP_SERVER_TYPES.find(t => t.value === server.type)?.label}`}
                            className="bg-background"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>API Key / Token</Label>
                          <div className="relative">
                            <Input
                              type={showTokens[server.id] ? "text" : "password"}
                              value={server.apiKey}
                              onChange={(e) => handleUpdateMcpServer(server.id, "apiKey", e.target.value)}
                              placeholder={MCP_SERVER_TYPES.find(t => t.value === server.type)?.placeholder}
                              className="bg-background pr-10"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2"
                              onClick={() => toggleShowToken(server.id)}
                            >
                              {showTokens[server.id] ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleTestMcpConnection(server.id)}
                          variant="outline"
                          className="w-full"
                          disabled={!server.type || !server.apiKey || server.isTesting}
                        >
                          {server.isTesting ? "Testing..." : "Test Connection"}
                        </Button>
                      </>
                    )}

                    {/* Tools Section - Only show for connected servers */}
                    {server.isConnected && server.serverId && server.type && (
                      <div className="space-y-2 pt-2 border-t border-border">
                        <div className="flex items-center gap-2 mb-3">
                          <Wrench className="w-4 h-4 text-muted-foreground" />
                          <Label className="text-sm font-semibold">Available Tools</Label>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {availableTools
                            .filter(tool => tool.mcpType === server.type)
                            .map((tool) => {
                              const serverTools = enabledTools[server.serverId];
                              // Default to enabled if serverTools doesn't exist, otherwise check the enabled array
                              const isEnabled = serverTools 
                                ? serverTools.enabled.includes(tool.name)
                                : true;
                              
                              return (
                                <Tooltip key={tool.name}>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => toggleTool(server.serverId!, tool.name)}
                                      className={`inline-flex items-center px-3 py-2 rounded-lg border transition-all text-left ${
                                        isEnabled
                                          ? 'bg-card border-border hover:border-foreground/20'
                                          : 'bg-muted/60 border-border hover:bg-muted/70'
                                      }`}
                                    >
                                      <span className={`text-sm font-medium truncate ${
                                        isEnabled ? 'text-foreground' : 'text-muted-foreground'
                                      }`}>
                                        {tool.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                      </span>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-xs">
                                    <p className="text-sm">{tool.description}</p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                        </div>
                        {availableTools.filter(tool => tool.mcpType === server.type).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            No tools available for this server type
                          </p>
                        )}
                      </div>
                    )}
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
};

export default Connections;
