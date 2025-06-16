const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // 添加这一行

// 管理员密码配置
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin'; // 默认密码
const SESSION_SECRET = process.env.SESSION_SECRET || 'lyrics-admin-secret-key';

// 中间件
app.use(cors());
app.use(express.json());

// 会话配置
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // 在生产环境中如果使用HTTPS，设置为true
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
}));

// 身份验证中间件
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  } else {
    return res.status(401).json({ error: '未授权访问，请先登录' });
  }
}

// 静态文件服务 - 但排除主页面
app.use('/login.html', express.static(path.join(__dirname, 'public', 'login.html')));
app.use('/style.css', express.static(path.join(__dirname, 'public', 'style.css')));
app.use('/script.js', express.static(path.join(__dirname, 'public', 'script.js')));

// 根据环境确定歌词目录路径
const getLyricsPath = () => {
  // 如果是生产环境（服务器）
  if (process.env.NODE_ENV === 'production') {
    return '/root/data/plugins/astrbot_plugin_lyricnext/data/lyrics/';
  }
  // 开发环境（本地）
  return path.join(__dirname, '..', 'data', 'lyrics');
};

const LYRICS_DIR = getLyricsPath();

// 确保歌词目录存在
async function ensureLyricsDir() {
  try {
    await fs.access(LYRICS_DIR);
  } catch (error) {
    console.log(`歌词目录不存在，创建目录: ${LYRICS_DIR}`);
    await fs.mkdir(LYRICS_DIR, { recursive: true });
  }
}

// 获取歌词文件列表（分页）
app.get('/api/lyrics', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 9;
    
    const files = await fs.readdir(LYRICS_DIR);
    const txtFiles = files.filter(file => file.endsWith('.txt')).sort();
    
    const total = txtFiles.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedFiles = txtFiles.slice(startIndex, endIndex);
    
    res.json({
      files: paginatedFiles,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('获取歌词列表失败:', error);
    res.status(500).json({ error: '获取歌词列表失败' });
  }
});

// 获取单个歌词文件内容
app.get('/api/lyrics/:filename', requireAuth, async (req, res) => {
  try {
    const filename = req.params.filename;
    if (!filename.endsWith('.txt')) {
      return res.status(400).json({ error: '无效的文件名' });
    }
    
    const filePath = path.join(LYRICS_DIR, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ filename, content });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: '文件不存在' });
    } else {
      console.error('读取歌词文件失败:', error);
      res.status(500).json({ error: '读取文件失败' });
    }
  }
});

// 创建新歌词文件
app.post('/api/lyrics', requireAuth, async (req, res) => {
  try {
    const { filename, content } = req.body;
    
    if (!filename || !content) {
      return res.status(400).json({ error: '文件名和内容不能为空' });
    }
    
    let finalFilename = filename;
    if (!finalFilename.endsWith('.txt')) {
      finalFilename += '.txt';
    }
    
    const filePath = path.join(LYRICS_DIR, finalFilename);
    
    // 检查文件是否已存在
    try {
      await fs.access(filePath);
      return res.status(409).json({ error: '文件已存在' });
    } catch (error) {
      // 文件不存在，可以创建
    }
    
    await fs.writeFile(filePath, content, 'utf-8');
    res.json({ message: '文件创建成功', filename: finalFilename });
  } catch (error) {
    console.error('创建歌词文件失败:', error);
    res.status(500).json({ error: '创建文件失败' });
  }
});

// 更新歌词文件
app.put('/api/lyrics/:filename', requireAuth, async (req, res) => {
  try {
    const filename = req.params.filename;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: '内容不能为空' });
    }
    
    if (!filename.endsWith('.txt')) {
      return res.status(400).json({ error: '无效的文件名' });
    }
    
    const filePath = path.join(LYRICS_DIR, filename);
    await fs.writeFile(filePath, content, 'utf-8');
    res.json({ message: '文件更新成功' });
  } catch (error) {
    console.error('更新歌词文件失败:', error);
    res.status(500).json({ error: '更新文件失败' });
  }
});

// 删除歌词文件
app.delete('/api/lyrics/:filename', requireAuth, async (req, res) => {
  try {
    const filename = req.params.filename;
    
    if (!filename.endsWith('.txt')) {
      return res.status(400).json({ error: '无效的文件名' });
    }
    
    const filePath = path.join(LYRICS_DIR, filename);
    await fs.unlink(filePath);
    res.json({ message: '文件删除成功' });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: '文件不存在' });
    } else {
      console.error('删除歌词文件失败:', error);
      res.status(500).json({ error: '删除文件失败' });
    }
  }
});

// 重命名歌词文件
app.patch('/api/lyrics/:filename/rename', requireAuth, async (req, res) => {
  try {
    const oldFilename = req.params.filename;
    const { newFilename } = req.body;
    
    if (!newFilename) {
      return res.status(400).json({ error: '新文件名不能为空' });
    }
    
    let finalNewFilename = newFilename;
    if (!finalNewFilename.endsWith('.txt')) {
      finalNewFilename += '.txt';
    }
    
    const oldPath = path.join(LYRICS_DIR, oldFilename);
    const newPath = path.join(LYRICS_DIR, finalNewFilename);
    
    // 检查新文件名是否已存在
    try {
      await fs.access(newPath);
      return res.status(409).json({ error: '目标文件名已存在' });
    } catch (error) {
      // 文件不存在，可以重命名
    }
    
    await fs.rename(oldPath, newPath);
    res.json({ message: '文件重命名成功', newFilename: finalNewFilename });
  } catch (error) {
    console.error('重命名歌词文件失败:', error);
    res.status(500).json({ error: '重命名文件失败' });
  }
});

// 搜索歌词
app.get('/api/search', requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: '搜索关键词不能为空' });
    }
    
    const files = await fs.readdir(LYRICS_DIR);
    const txtFiles = files.filter(file => file.endsWith('.txt'));
    const results = [];
    
    for (const file of txtFiles) {
      const filePath = path.join(LYRICS_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      
      if (file.toLowerCase().includes(q.toLowerCase()) || 
          content.toLowerCase().includes(q.toLowerCase())) {
        results.push({
          filename: file,
          content: content.substring(0, 200) + (content.length > 200 ? '...' : '')
        });
      }
    }
    
    res.json(results);
  } catch (error) {
    console.error('搜索失败:', error);
    res.status(500).json({ error: '搜索失败' });
  }
});

// 身份验证路由
app.post('/api/auth/login', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: '请输入密码' });
    }
    
    // 验证密码
    if (password === ADMIN_PASSWORD) {
      req.session.authenticated = true;
      res.json({ message: '登录成功' });
    } else {
      res.status(401).json({ error: '密码错误' });
    }
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 退出登录
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: '退出失败' });
    }
    res.json({ message: '退出成功' });
  });
});

// 检查登录状态
app.get('/api/auth/status', (req, res) => {
  res.json({ authenticated: !!req.session.authenticated });
});

// 主页面保护 - 未登录重定向到登录页
app.get('/', (req, res) => {
  if (req.session && req.session.authenticated) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.redirect('/login.html');
  }
});

// 启动服务器
async function startServer() {
  try {
    await ensureLyricsDir();      app.listen(PORT, HOST, () => {
          console.log(`歌词管理系统运行在 http://${HOST}:${PORT}`);
          console.log(`歌词目录: ${LYRICS_DIR}`);
          console.log(`环境: ${process.env.NODE_ENV || 'production'}`);
          console.log(`外网访问地址: http://你的服务器IP:${PORT}`);
      });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

startServer();
