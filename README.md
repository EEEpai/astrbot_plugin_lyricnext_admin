# 歌词管理系统

一个简单易用的歌词文件管理系统，支持歌词的查看、编辑、删除、新增等功能。

## 功能特性

- � **身份验证**: 密码保护，确保系统安全
- �📝 **歌词管理**: 新增、编辑、删除、重命名歌词文件
- 🔍 **搜索功能**: 支持按歌曲名称和歌词内容搜索
- 📱 **响应式设计**: 适配桌面和移动设备
- 🎨 **现代化UI**: 美观的界面设计
- 🚀 **易于部署**: 基于Node.js，轻量级部署

## 安装和运行

## 快速开始

### Windows 用户
```bash
# 双击运行部署脚本
deploy-windows.bat
```

### Linux 用户  
```bash
# 运行部署脚本
chmod +x deploy-linux.sh
./deploy-linux.sh
```

### 手动安装

1. **配置设置**
   编辑 `config.conf` 文件修改端口和密码

2. **安装依赖**
   ```bash
   cd admin
   npm install
   ```

3. **启动服务**
   ```bash
   npm start
   ```

4. **访问系统**
   - 浏览器访问: http://localhost:3000
   - 默认密码: `admin`

### 生产环境部署

**Linux服务器:**
```bash
./deploy-linux.sh
```

**Windows服务器:**
```bash
deploy-windows.bat
```

## 配置说明

编辑 `config.conf` 文件修改配置：
- `PORT` - 服务端口（默认3000）  
- `ADMIN_PASSWORD` - 管理员密码（默认admin）
- `NODE_ENV` - 运行环境

## 路径配置

- **开发环境**: `../data/lyrics/`
- **生产环境**: `/root/data/plugins/astrbot_plugin_lyricnext/data/lyrics/`

## 技术栈

- **后端**: Node.js + Express
- **前端**: HTML + CSS + JavaScript

## 许可证

MIT License
