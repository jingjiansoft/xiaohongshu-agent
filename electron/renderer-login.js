/**
 * Electron 渲染进程 - 登录功能
 * 在 Web 页面中调用 Electron 的登录功能
 */

// 监听登录结果
window.electronAPI?.onLoginResult((result) => {
  if (result.success) {
    alert('✅ 登录成功！\n\n现在可以开始发布笔记了。');
    // 刷新页面或更新状态
    window.location.reload();
  } else {
    alert('❌ 登录失败：' + result.message);
  }
});

// 打开登录窗口
async function openLoginWindow() {
  if (!window.electronAPI) {
    alert('请在桌面应用中使用此功能');
    return;
  }

  const confirmed = confirm('将打开浏览器窗口进行扫码登录。\n\n登录成功后会自动保存 Cookie，下次发布无需重新登录。\n\n是否继续？');
  if (!confirmed) return;

  try {
    const result = await window.electronAPI.openLogin();
    // 结果会通过 onLoginResult 回调处理
  } catch (error) {
    alert('打开登录窗口失败：' + error.message);
  }
}

// 检查登录状态
async function checkLoginStatus() {
  if (!window.electronAPI) {
    return { isLoggedIn: false, error: '非桌面环境' };
  }

  try {
    return await window.electronAPI.checkLoginStatus();
  } catch (error) {
    console.error('检查登录状态失败:', error);
    return { isLoggedIn: false, error: error.message };
  }
}

// 退出登录
async function logout() {
  if (!window.electronAPI) {
    return { success: false, error: '非桌面环境' };
  }

  const confirmed = confirm('确定要退出登录吗？\n\n退出后需要重新扫码登录才能发布笔记。');
  if (!confirmed) return { success: false, message: '已取消' };

  try {
    return await window.electronAPI.logout();
  } catch (error) {
    console.error('退出登录失败:', error);
    return { success: false, error: error.message };
  }
}

// 导出函数（如果在模块环境中）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { openLoginWindow, checkLoginStatus, logout };
}
