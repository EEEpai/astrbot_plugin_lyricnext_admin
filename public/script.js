// 全局变量
let currentLyrics = [];
let currentEditingFile = null;
let currentMode = 'create'; // 'create' 或 'edit'
let currentPage = 1;
let totalPages = 1;
let isSearchMode = false;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查登录状态
    checkAuthStatus();
    loadLyrics();
    
    // 搜索框回车搜索
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchLyrics();
        }
    });
    
    // 检查提示框显示状态
    checkTipVisibility();
});

// 显示消息提示
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 复制指令到剪贴板
function copyCommand() {
    navigator.clipboard.writeText('/lyric reload').then(() => {
        showToast('指令已复制到剪贴板', 'success');
    }).catch(() => {
        showToast('复制失败，请手动复制', 'error');
    });
}

// 加载歌词（分页）
async function loadLyrics(page = 1) {
    try {
        const response = await fetch(`/api/lyrics?page=${page}&pageSize=9`);
        if (!response.ok) {
            throw new Error('加载失败');
        }
        
        const data = await response.json();
        currentLyrics = data.files;
        currentPage = data.pagination.page;
        totalPages = data.pagination.totalPages;
        
        await displayLyrics(currentLyrics);
        updatePagination(data.pagination);
        
        // 显示分页控件
        document.getElementById('pagination').style.display = 'flex';
        isSearchMode = false;
    } catch (error) {
        console.error('加载歌词失败:', error);
        showToast('加载歌词失败', 'error');
        document.getElementById('lyricsList').innerHTML = '<div class="loading">加载失败，请刷新页面重试</div>';
    }
}

// 显示歌词列表
async function displayLyrics(files) {
    const container = document.getElementById('lyricsList');
    
    if (files.length === 0) {
        container.innerHTML = '<div class="loading">暂无歌词文件</div>';
        return;
    }
    
    container.innerHTML = '<div class="loading">加载歌词内容中...</div>';
    
    const lyricsWithContent = [];
    
    // 并行加载所有歌词内容预览
    const promises = files.map(async (filename) => {
        try {
            const response = await fetch(`/api/lyrics/${encodeURIComponent(filename)}`);
            if (response.ok) {
                const data = await response.json();
                const preview = data.content.length > 100 
                    ? data.content.substring(0, 100) + '...' 
                    : data.content;
                return { filename, preview };
            }
        } catch (error) {
            console.error(`加载 ${filename} 失败:`, error);
        }
        return { filename, preview: '预览加载失败' };
    });
    
    const results = await Promise.all(promises);
    lyricsWithContent.push(...results);
    
    // 渲染歌词卡片
    container.innerHTML = lyricsWithContent.map(({ filename, preview }) => {
        const songName = filename.replace('.txt', '');
        return `
            <div class="lyrics-item">
                <h3>${escapeHtml(songName)}</h3>
                <div class="lyrics-preview">${escapeHtml(preview)}</div>
                <div class="lyrics-actions">
                    <button class="btn btn-edit btn-small" onclick="editLyrics('${escapeHtml(filename)}')">编辑</button>
                    <button class="btn btn-rename btn-small" onclick="showRenameModal('${escapeHtml(filename)}')">重命名</button>
                    <button class="btn btn-danger btn-small" onclick="showDeleteModal('${escapeHtml(filename)}')">删除</button>
                </div>
            </div>
        `;
    }).join('');
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 搜索歌词
async function searchLyrics() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) {
        showAllLyrics();
        return;
    }
    
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error('搜索失败');
        }
        
        const results = await response.json();
        displaySearchResults(results);
    } catch (error) {
        console.error('搜索失败:', error);
        showToast('搜索失败', 'error');
    }
}

// 显示搜索结果
function displaySearchResults(results) {
    document.getElementById('lyricsList').style.display = 'none';
    const searchResults = document.getElementById('searchResults');
    const resultsList = document.getElementById('searchResultsList');
    
    if (results.length === 0) {
        resultsList.innerHTML = '<div class="loading">未找到匹配的歌词</div>';
    } else {
        resultsList.innerHTML = results.map(({ filename, content }) => {
            const songName = filename.replace('.txt', '');
            return `
                <div class="lyrics-item">
                    <h3>${escapeHtml(songName)}</h3>
                    <div class="lyrics-preview">${escapeHtml(content)}</div>
                    <div class="lyrics-actions">
                        <button class="btn btn-edit btn-small" onclick="editLyrics('${escapeHtml(filename)}')">编辑</button>
                        <button class="btn btn-rename btn-small" onclick="showRenameModal('${escapeHtml(filename)}')">重命名</button>
                        <button class="btn btn-danger btn-small" onclick="showDeleteModal('${escapeHtml(filename)}')">删除</button>
                    </div>
                </div>
            `;
        }).join('');    }
    
    searchResults.style.display = 'block';
    // 隐藏分页控件
    document.getElementById('pagination').style.display = 'none';
    isSearchMode = true;
}

// 显示所有歌词
function showAllLyrics() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').style.display = 'none';
    document.getElementById('lyricsList').style.display = 'grid';
    document.getElementById('pagination').style.display = 'flex';
    isSearchMode = false;
    loadLyrics(currentPage); // 重新加载当前页
}

// 显示创建模态框
function showCreateModal() {
    currentMode = 'create';
    currentEditingFile = null;
    document.getElementById('modalTitle').textContent = '新建歌词';
    document.getElementById('filenameInput').value = '';
    document.getElementById('contentInput').value = '';
    document.getElementById('filenameInput').disabled = false;
    document.getElementById('editModal').style.display = 'block';
}

// 编辑歌词
async function editLyrics(filename) {
    try {
        const response = await fetch(`/api/lyrics/${encodeURIComponent(filename)}`);
        if (!response.ok) {
            throw new Error('加载失败');
        }
        
        const data = await response.json();
        currentMode = 'edit';
        currentEditingFile = filename;
        document.getElementById('modalTitle').textContent = '编辑歌词';
        document.getElementById('filenameInput').value = filename.replace('.txt', '');
        document.getElementById('contentInput').value = data.content;
        document.getElementById('filenameInput').disabled = true;
        document.getElementById('editModal').style.display = 'block';
    } catch (error) {
        console.error('加载歌词失败:', error);
        showToast('加载歌词失败', 'error');
    }
}

// 保存歌词
async function saveLyrics() {
    const filename = document.getElementById('filenameInput').value.trim();
    const content = document.getElementById('contentInput').value.trim();
    
    if (!filename) {
        showToast('请输入歌曲名称', 'error');
        return;
    }
    
    if (!content) {
        showToast('请输入歌词内容', 'error');
        return;
    }
    
    try {
        let response;
        if (currentMode === 'create') {
            response = await fetch('/api/lyrics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filename, content }),
            });
        } else {
            response = await fetch(`/api/lyrics/${encodeURIComponent(currentEditingFile)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content }),
            });
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '保存失败');
        }
          const result = await response.json();
        showToast(result.message, 'success');
        closeModal();
        // 刷新当前页数据
        if (isSearchMode) {
            searchLyrics();
        } else {
            loadLyrics(currentPage);
        }
    } catch (error) {
        console.error('保存失败:', error);
        showToast(error.message, 'error');
    }
}

// 显示删除确认模态框
function showDeleteModal(filename) {
    currentEditingFile = filename;
    document.getElementById('deleteFilename').textContent = filename.replace('.txt', '');
    document.getElementById('deleteModal').style.display = 'block';
}

// 确认删除
async function confirmDelete() {
    if (!currentEditingFile) return;
    
    try {
        const response = await fetch(`/api/lyrics/${encodeURIComponent(currentEditingFile)}`, {
            method: 'DELETE',
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '删除失败');
        }
          const result = await response.json();
        showToast(result.message, 'success');
        closeDeleteModal();
        // 刷新当前页数据
        if (isSearchMode) {
            searchLyrics();
        } else {
            loadLyrics(currentPage);
        }
    } catch (error) {
        console.error('删除失败:', error);
        showToast(error.message, 'error');
    }
}

// 显示重命名模态框
function showRenameModal(filename) {
    currentEditingFile = filename;
    document.getElementById('newFilenameInput').value = filename.replace('.txt', '');
    document.getElementById('renameModal').style.display = 'block';
}

// 确认重命名
async function confirmRename() {
    const newFilename = document.getElementById('newFilenameInput').value.trim();
    
    if (!newFilename) {
        showToast('请输入新的歌曲名称', 'error');
        return;
    }
    
    if (!currentEditingFile) return;
    
    try {
        const response = await fetch(`/api/lyrics/${encodeURIComponent(currentEditingFile)}/rename`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ newFilename }),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '重命名失败');
        }
          const result = await response.json();
        showToast(result.message, 'success');
        closeRenameModal();
        // 刷新当前页数据
        if (isSearchMode) {
            searchLyrics();
        } else {
            loadLyrics(currentPage);
        }
    } catch (error) {
        console.error('重命名失败:', error);
        showToast(error.message, 'error');
    }
}

// 更新分页控件
function updatePagination(pagination) {
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    pageInfo.textContent = `第 ${pagination.page} 页，共 ${pagination.totalPages} 页`;
    prevBtn.disabled = !pagination.hasPrev;
    nextBtn.disabled = !pagination.hasNext;
}

// 上一页
function prevPage() {
    if (currentPage > 1) {
        loadLyrics(currentPage - 1);
    }
}

// 下一页
function nextPage() {
    if (currentPage < totalPages) {
        loadLyrics(currentPage + 1);
    }
}

// 关闭模态框
function closeModal() {
    document.getElementById('editModal').style.display = 'none';
    currentEditingFile = null;
}

function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    currentEditingFile = null;
}

function closeRenameModal() {
    document.getElementById('renameModal').style.display = 'none';
    currentEditingFile = null;
}

// 点击模态框外部关闭
window.onclick = function(event) {
    const editModal = document.getElementById('editModal');
    const deleteModal = document.getElementById('deleteModal');
    const renameModal = document.getElementById('renameModal');
    
    if (event.target === editModal) {
        closeModal();
    } else if (event.target === deleteModal) {
        closeDeleteModal();
    } else if (event.target === renameModal) {
        closeRenameModal();
    }
}

// 检查登录状态
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        
        if (!data.authenticated) {
            // 未登录，重定向到登录页
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('检查登录状态失败:', error);
        window.location.href = '/login.html';
    }
}

// 退出登录
async function logout() {
    if (confirm('确定要退出登录吗？')) {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST'
            });
            
            if (response.ok) {
                showToast('退出成功', 'success');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 1000);
            } else {
                showToast('退出失败', 'error');
            }
        } catch (error) {
            console.error('退出失败:', error);
            showToast('网络错误', 'error');
        }
    }
}
