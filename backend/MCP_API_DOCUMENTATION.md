# MCP Server Management API Documentation

## Overview

supports multiple MCP (Model Context Protocol) server connections, allowing users to integrate various services for enhanced AI assistance.

## Supported MCP Server Types

- **Canvas** (`canvas`) - Learning Management System
- **Google Drive** (`google_drive`) - Cloud storage and documents
- **GitHub** (`github`) - Code repositories
- **Notion** (`notion`) - Notes and knowledge base
- **Slack** (`slack`) - Team communication
- **Custom** (`custom`) - Custom MCP servers

---

## API Endpoints

### List All MCP Servers

#### `GET /api/mcp/servers`
Get all registered MCP servers.

**Response:**
```json
{
  "success": true,
  "count": 3,
  "servers": [
    {
      "id": "canvas_default",
      "type": "canvas",
      "name": "Canvas LMS",
      "apiUrl": "https://canvas.instructure.com/api/v1",
      "status": "connected",
      "lastSync": "2025-10-28T10:00:00.000Z",
      "createdAt": "2025-10-28T09:00:00.000Z",
      "updatedAt": "2025-10-28T10:00:00.000Z",
      "hasApiKey": true
    },
    {
      "id": "github_main",
      "type": "github",
      "name": "My GitHub",
      "status": "connected",
      "lastSync": "2025-10-28T10:05:00.000Z",
      "hasApiKey": true
    }
  ]
}
```

---

### Get Single MCP Server

#### `GET /api/mcp/servers/:id`
Get details of a specific MCP server.

**Response:**
```json
{
  "success": true,
  "server": {
    "id": "github_main",
    "type": "github",
    "name": "My GitHub",
    "status": "connected",
    "lastSync": "2025-10-28T10:05:00.000Z",
    "hasApiKey": true
  }
}
```

---

### Add New MCP Server

#### `POST /api/mcp/servers`
Register a new MCP server connection.

**Request Body:**
```json
{
  "type": "github",
  "name": "My GitHub Account",
  "apiKey": "ghp_xxxxxxxxxxxxxxxxxxxx",
  "apiUrl": "https://api.github.com",  // Optional for most types
  "config": {                            // Optional additional config
    "username": "johndoe"
  }
}
```

**Valid Types:**
- `canvas`
- `google_drive`
- `github`
- `notion`
- `slack`
- `custom`

**Success Response (200):**
```json
{
  "success": true,
  "message": "MCP server added successfully",
  "server": {
    "id": "mcp_1730123456_abc123",
    "type": "github",
    "name": "My GitHub Account",
    "status": "disconnected",
    "hasApiKey": true
  }
}
```

**Error Response (400):**
```json
{
  "error": "Type and name are required"
}
```

---

### Update MCP Server

#### `PUT /api/mcp/servers/:id`
Update an existing MCP server configuration.

**Request Body:**
```json
{
  "name": "Updated GitHub Account",
  "apiKey": "new_token_here",
  "apiUrl": "https://api.github.com",
  "config": {
    "username": "newusername"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "MCP server updated successfully",
  "server": {
    "id": "github_main",
    "type": "github",
    "name": "Updated GitHub Account",
    "status": "disconnected",
    "updatedAt": "2025-10-28T11:00:00.000Z"
  }
}
```

---

### Delete MCP Server

#### `DELETE /api/mcp/servers/:id`
Remove an MCP server connection.

**Response:**
```json
{
  "success": true,
  "message": "Server github_main deleted"
}
```

---

### Test MCP Server Connection

#### `POST /api/mcp/servers/:id/test`
Test connection to a specific MCP server.

**Response Success:**
```json
{
  "success": true,
  "message": "GitHub connected successfully",
  "data": {
    "username": "johndoe"
  }
}
```

**Response Error:**
```json
{
  "success": false,
  "error": "Invalid GitHub token"
}
```

---

### Get MCP Statistics

#### `GET /api/mcp/stats`
Get statistics about all MCP server connections.

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 5,
    "connected": 3,
    "disconnected": 1,
    "error": 1,
    "byType": {
      "canvas": 1,
      "github": 1,
      "google_drive": 1,
      "notion": 1,
      "slack": 1,
      "custom": 0
    }
  }
}
```

---

### Get Available Tools

#### `GET /api/mcp/tools`
Get list of tools available from all connected MCP servers.

**Response:**
```json
{
  "success": true,
  "count": 6,
  "tools": [
    {
      "name": "list_upcoming_assignments",
      "description": "List upcoming assignments from Canvas",
      "mcpType": "canvas"
    },
    {
      "name": "search_github_repos",
      "description": "Search GitHub repositories",
      "mcpType": "github"
    },
    {
      "name": "search_drive_files",
      "description": "Search Google Drive files",
      "mcpType": "google_drive"
    }
  ]
}
```

---

## Configuration Examples

### Canvas LMS

```json
{
  "type": "canvas",
  "name": "University Canvas",
  "apiKey": "your_canvas_api_token",
  "apiUrl": "https://canvas.university.edu/api/v1"
}
```

### Google Drive

```json
{
  "type": "google_drive",
  "name": "My Google Drive",
  "apiKey": "your_google_oauth_token"
}
```

**Note:** For Google Drive, you'll need an OAuth2 access token. See [Google Drive API docs](https://developers.google.com/drive/api/guides/about-auth).

### GitHub

```json
{
  "type": "github",
  "name": "My GitHub",
  "apiKey": "ghp_your_personal_access_token"
}
```

**Generate token:** GitHub Settings → Developer settings → Personal access tokens

### Notion

```json
{
  "type": "notion",
  "name": "My Notion Workspace",
  "apiKey": "secret_your_integration_token"
}
```

**Create integration:** [Notion Integrations](https://www.notion.so/my-integrations)

### Slack

```json
{
  "type": "slack",
  "name": "Team Slack",
  "apiKey": "xoxb-your-bot-token"
}
```

**Create app:** [Slack Apps](https://api.slack.com/apps)

### Custom Server

```json
{
  "type": "custom",
  "name": "My Custom MCP Server",
  "apiKey": "optional_api_key",
  "apiUrl": "https://my-mcp-server.com",
  "config": {
    "healthEndpoint": "/api/health",
    "timeout": 5000
  }
}
```

---

## Frontend Integration

### React API Client Example

```typescript
// src/lib/mcpApi.ts
const API_URL = import.meta.env.VITE_API_URL;

export const mcpApi = {
  // List all servers
  async listServers() {
    const res = await fetch(`${API_URL}/api/mcp/servers`);
    return res.json();
  },

  // Add new server
  async addServer(config: {
    type: string;
    name: string;
    apiKey: string;
    apiUrl?: string;
  }) {
    const res = await fetch(`${API_URL}/api/mcp/servers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return res.json();
  },

  // Test connection
  async testConnection(serverId: string) {
    const res = await fetch(`${API_URL}/api/mcp/servers/${serverId}/test`, {
      method: 'POST'
    });
    return res.json();
  },

  // Update server
  async updateServer(serverId: string, updates: any) {
    const res = await fetch(`${API_URL}/api/mcp/servers/${serverId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  // Delete server
  async deleteServer(serverId: string) {
    const res = await fetch(`${API_URL}/api/mcp/servers/${serverId}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // Get statistics
  async getStats() {
    const res = await fetch(`${API_URL}/api/mcp/stats`);
    return res.json();
  },

  // Get available tools
  async getTools() {
    const res = await fetch(`${API_URL}/api/mcp/tools`);
    return res.json();
  }
};
```

### React Component Example

```tsx
// Connections page example
import { useState, useEffect } from 'react';
import { mcpApi } from '@/lib/mcpApi';

export default function ConnectionsPage() {
  const [servers, setServers] = useState([]);
  const [newServer, setNewServer] = useState({
    type: 'github',
    name: '',
    apiKey: ''
  });

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    const result = await mcpApi.listServers();
    setServers(result.servers);
  };

  const handleAddServer = async (e) => {
    e.preventDefault();
    await mcpApi.addServer(newServer);
    loadServers();
    setNewServer({ type: 'github', name: '', apiKey: '' });
  };

  const handleTestConnection = async (serverId) => {
    const result = await mcpApi.testConnection(serverId);
    alert(result.success ? 'Connected!' : `Error: ${result.error}`);
    loadServers();
  };

  const handleDelete = async (serverId) => {
    if (confirm('Delete this connection?')) {
      await mcpApi.deleteServer(serverId);
      loadServers();
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-white mb-8">Connections</h1>

      {/* Add New Server Form */}
      <form onSubmit={handleAddServer} className="mb-8 bg-[#1C1F26] p-6 rounded-xl">
        <h2 className="text-xl font-semibold text-white mb-4">Add New Connection</h2>
        
        <select
          value={newServer.type}
          onChange={(e) => setNewServer({ ...newServer, type: e.target.value })}
          className="w-full mb-4 bg-[#252930] border border-gray-700 rounded-lg px-4 py-3 text-white"
        >
          <option value="canvas">Canvas LMS</option>
          <option value="github">GitHub</option>
          <option value="google_drive">Google Drive</option>
          <option value="notion">Notion</option>
          <option value="slack">Slack</option>
          <option value="custom">Custom Server</option>
        </select>

        <input
          type="text"
          placeholder="Connection Name"
          value={newServer.name}
          onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
          className="w-full mb-4 bg-[#252930] border border-gray-700 rounded-lg px-4 py-3 text-white"
          required
        />

        <input
          type="password"
          placeholder="API Key / Token"
          value={newServer.apiKey}
          onChange={(e) => setNewServer({ ...newServer, apiKey: e.target.value })}
          className="w-full mb-4 bg-[#252930] border border-gray-700 rounded-lg px-4 py-3 text-white"
          required
        />

        <button
          type="submit"
          className="bg-[#10B981] hover:bg-[#059669] text-white px-6 py-3 rounded-lg font-semibold"
        >
          Add Connection
        </button>
      </form>

      {/* Server List */}
      <div className="space-y-4">
        {servers.map((server) => (
          <div key={server.id} className="bg-[#1C1F26] p-6 rounded-xl border border-gray-800">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold text-white">{server.name}</h3>
                <p className="text-gray-400 text-sm">{server.type}</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm ${
                  server.status === 'connected' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {server.status}
                </span>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleTestConnection(server.id)}
                  className="bg-[#A855F7] hover:bg-[#9333EA] text-white px-4 py-2 rounded-lg text-sm"
                >
                  Test
                </button>
                <button
                  onClick={() => handleDelete(server.id)}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Security Considerations

### API Key Storage
- **Backend:** API keys are stored in memory (mcpManager)
- **Production:** Use encrypted database storage
- **Frontend:** Never expose API keys in client-side code

### Token Permissions
- Use minimum required permissions for each service
- Regular token rotation recommended
- Revoke tokens when no longer needed

### Best Practices
1. **Canvas:** Read-only tokens when possible
2. **GitHub:** Scope tokens to specific repos/organizations
3. **Google Drive:** Request only necessary OAuth scopes
4. **Notion:** Limit integration access to specific pages/databases
5. **Slack:** Use bot tokens with minimal permissions

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

Common error codes:
- `400` - Bad Request (invalid parameters)
- `404` - Server Not Found
- `500` - Internal Server Error

---

## Rate Limiting

### Service Rate Limits
- **Canvas:** ~100 requests per 10 seconds
- **GitHub:** 5000 requests per hour (authenticated)
- **Google Drive:** 1000 requests per 100 seconds
- **Notion:** 3 requests per second
- **Slack:** Varies by method (typically 1-20 per minute)

### Best Practices
- Cache responses when possible
- Implement exponential backoff for retries
- Monitor rate limit headers

---

## Future Enhancements

- [ ] Database persistence for MCP servers
- [ ] Encrypted API key storage
- [ ] OAuth2 flow integration
- [ ] Webhook support for real-time updates
- [ ] Batch operations
- [ ] Server health monitoring
- [ ] Usage analytics per server
- [ ] Automatic token refresh

---

## Support

For issues or questions:
- GitHub: https://github.com/Brian-Two/nvidia-hacks
- Documentation: See main API_DOCUMENTATION.md
- Test connections: `POST /api/mcp/servers/:id/test`

