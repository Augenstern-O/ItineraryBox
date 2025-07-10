<template>
  <div id="app">
    <el-container>
      <el-header>
        <div class="header-content">
          <img src="@/assets/Logo.png" alt="Logo" class="app-logo">
          <h1>行程单盒子</h1>
        </div>
      </el-header>
      <el-main>
        <router-view></router-view>
      </el-main>
    </el-container>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
/* Reset default browser styles and set root containers to full viewport height */
html, body {
  margin: 0;
  padding: 0;
  height: 100vh; /* Set to full viewport height */
  overflow: hidden; /* Prevent scrolling on html and body */
}

#app {
  font-family: 'Microsoft YaHei', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  height: 100vh; /* Ensure app container also takes full height */
  display: flex; /* Use flexbox for vertical layout */
  flex-direction: column; /* Stack header and main vertically */
  overflow: hidden; /* Prevent app container scrolling */
}

.el-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Style for the fixed header */
.el-header {
  background-color: #FFF; /* Changed background to white */
  color: white;
  text-align: center;
  height: 56px; /* Set a fixed height for the header (adjust if needed) */
  flex-shrink: 0; /* Prevent header from shrinking */
  display: flex; /* Use flexbox to center content */
  align-items: center;
  justify-content: center; /* Center header content */
  padding: 0;
}

.header-content {
  display: flex; /* Use flexbox for logo and title */
  align-items: center; /* Align logo and title vertically */
}

.app-logo {
  height: 40px; /* Set logo height */
  margin-right: 10px; /* Add space between logo and title */
}

.el-header h1 {
  margin: 0;
  font-size: 28px;
  color: #2750BA; /* Changed text color to blue */
}

/* Style for the main content area, filling remaining space */
.el-main {
  padding: 0;
  flex-grow: 1;
  overflow: auto;
  height: calc(100vh - 56px);
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0; /* 添加这行，确保 flex 布局正确计算高度 */
}

/* Remove potentially conflicting global styles targeting Element Plus components */
/* We will handle necessary styling within Home.vue scoped styles */
/*
:deep(.el-main) {
  padding: 0 !important;
  overflow: hidden !important;
  height: 100% !important;
}

:deep(.el-container) {
  height: 100% !important;
  overflow: hidden !important;
}
*/
</style> 