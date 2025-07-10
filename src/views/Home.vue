<template>
  <div class="fphz-bg">
    <div class="fphz-main">
      <!-- 左侧文件区 -->
      <div class="fphz-left">
        <div class="fphz-filelist-card">
          <div class="fphz-filelist-title">已上传 {{ fileList.length }} 个文件 <span class="fphz-filelist-clear" @click="clearFiles" v-if="fileList.length">清空</span></div>

          <!-- 文件列表和上传区域 -->
          <div class="fphz-files-area">
            <div v-if="fileList.length > 0" class="fphz-filelist-grid">
              <div v-for="file in fileList" :key="file.uid" class="fphz-file-card">
                <img :src="pdfIcon" class="fphz-file-icon" />
                <span class="fphz-file-name" :title="file.name">{{ file.name }}</span>
                <el-icon class="fphz-file-remove" @click.stop="removeFile(file)"><i-ep-close /></el-icon>
              </div>
              <el-upload
                class="fphz-upload-card-small"
                drag
                action="#"
                :auto-upload="false"
                :on-change="handleFileChange"
                :on-remove="handleRemove"
                :file-list="fileList"
                multiple
                accept=".pdf"
                :show-file-list="false"
              >
                <div class="fphz-upload-plus-small">
                  <span class="fphz-plus-icon">+</span>
                </div>
              </el-upload>
            </div>
            <el-upload
              v-else
              class="fphz-upload-area-large"
              drag
              action="#"
              :auto-upload="false"
              :on-change="handleFileChange"
              :on-remove="handleRemove"
              :file-list="fileList"
              multiple
              accept=".pdf"
              :show-file-list="false"
            >
              <div class="fphz-upload-plus-large">
                <span class="fphz-plus-icon">+</span>
                <p>拖拽文件到此区域上传</p>
              </div>
            </el-upload>
          </div>

          <div class="fphz-radio-area">
            <div class="fphz-radio-label">每页行程单数量</div>
            <el-radio-group v-model="form.invoicesPerPage" class="fphz-radio-group">
              <el-radio :label="2">每页2张行程单</el-radio>
              <el-radio :label="3">每页3张行程单</el-radio>
              <el-radio :label="4">每页4张行程单</el-radio>
            </el-radio-group>
          </div>
        </div>
      </div>
      <!-- 中间预览区 -->
      <div class="fphz-center">
        <div class="fphz-preview-card">
          <iframe v-if="previewUrl" :src="previewUrl + '#toolbar=1&navpanes=0'" width="100%" height="100%" frameborder="0" />
          <div v-else class="fphz-preview-placeholder">您还没有添加行程单哦</div>
        </div>
      </div>
      <!-- 右侧提示与下载 -->
      <div class="fphz-right">
        <div class="fphz-tips-card">
          <div class="fphz-tips-title">使用教程</div>
          <ol class="fphz-tips-list">
            <li>在左边区域添加需要合并的行程单</li>
            <li>选择每页合并几张行程单</li>
            <li>预览无误后即可下载打印</li>
          </ol>
        </div>
        <div class="fphz-download-area">
          <el-button type="primary" size="large" :disabled="!previewUrl" @click="downloadMergedFile" class="fphz-download-btn fphz-blue-btn">下载PDF</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import pdfIcon from '@/assets/PDF.png' // 引入 PDF.png 图片
import { Close } from '@element-plus/icons-vue'
import { PDFDocument, rgb } from 'pdf-lib'

export default {
  name: 'Home',
  components: {
    'i-ep-close': Close
  },
  setup() {
    const fileList = ref([])
    const previewUrl = ref('')
    const mergedPdfBlob = ref(null)

    const form = reactive({
      invoicesPerPage: 2
    })

    // 监听 fileList 变化，自动刷新预览
    const refreshPreview = () => {
      if (fileList.value.length > 0) {
        previewMerge()
      } else {
        previewUrl.value = ''
        mergedPdfBlob.value = null
      }
    }

    // 监听每页行程单数量变化，自动刷新预览
    watch(() => form.invoicesPerPage, () => {
      refreshPreview()
    })

    // 处理文件上传和删除
    const handleFileChange = (file, fileListRaw) => {
      // 过滤非PDF文件，并更新fileList.value
      const newFileList = fileListRaw.filter(f => f.raw && f.raw.type === 'application/pdf');

      // 检查是否有非PDF文件被排除，给出提示
      const nonPdfFiles = fileListRaw.filter(f => !(f.raw && f.raw.type === 'application/pdf'));
      if (nonPdfFiles.length > 0) {
        ElMessage.warning(`已自动过滤掉 ${nonPdfFiles.length} 个非PDF文件。`)
      }

      fileList.value = newFileList;
      refreshPreview()
    }

    const handleRemove = (file, fileListRaw) => {
      fileList.value = fileListRaw.filter(f => f.raw && f.raw.type === 'application/pdf')
      refreshPreview()
    }
    // 手动删除文件
    const removeFile = (file) => {
      const idx = fileList.value.findIndex(f => f.uid === file.uid)
      if (idx !== -1) {
        fileList.value.splice(idx, 1)
        refreshPreview()
      }
    }

    const clearFiles = () => {
      fileList.value = []
      previewUrl.value = ''
      mergedPdfBlob.value = null
    }

    // 画虚线
    const drawDashedLine = (page, y, marginLeft, marginRight) => {
      const width = 595 - marginLeft - marginRight
      const dashLength = 5
      const gapLength = 5
      let x = marginLeft
      while (x < width + marginLeft) {
        page.drawLine({
          start: { x, y },
          end: { x: Math.min(x + dashLength, width + marginLeft), y },
          color: rgb(0.5, 0.5, 0.5),
          thickness: 0.5
        })
        x += dashLength + gapLength
      }
    }

    // 合并并预览（自动裁剪白边最大化内容区，并对行程单进行切割处理）
    const previewMerge = async () => {
      if (fileList.value.length === 0) {
        previewUrl.value = '';
        mergedPdfBlob.value = null;
        return;
      }

      try {
        const margin = 28 // 10mm ≈ 28pt
        const pageWidth = 595
        const pageHeight = 842
        const contentWidth = pageWidth - margin * 2
        const contentHeight = pageHeight - margin * 2

        // 加载所有PDF第一页，获取实际内容区域（优先CropBox）
        const pdfs = []
        const cropBoxes = []
        for (const file of fileList.value) {
          const fileArrayBuffer = await file.raw.arrayBuffer()
          const pdf = await PDFDocument.load(fileArrayBuffer)
          const [firstPage] = pdf.getPages()
          let cropBox = null
          if (firstPage) {
            // 获取页面原始尺寸（完整尺寸）
            let originalBox = null
            
            if (firstPage.node && typeof firstPage.node.CropBox === 'function' && firstPage.node.CropBox()) {
              originalBox = firstPage.node.CropBox().asRectangle()
            } else if (typeof firstPage.getCropBox === 'function') {
              originalBox = firstPage.getCropBox()
            } else {
              originalBox = firstPage.getMediaBox()
            }
            
            // 只截取上半部分
            cropBox = {
              x: originalBox.x,
              y: originalBox.y + originalBox.height / 2, // 从底部的一半开始
              width: originalBox.width,
              height: originalBox.height / 2 // 只取高度的一半
            }
          } else {
            // 默认A4尺寸的上半部分
            cropBox = { 
              x: 0, 
              y: 421, // 从中间开始，842/2
              width: 595, 
              height: 421 // A4高度的一半
            }
          }
          cropBoxes.push(cropBox)
          pdfs.push(pdf)
        }

        const newPdf = await PDFDocument.create()
        const perPage = form.invoicesPerPage
        const total = pdfs.length
        for (let i = 0; i < total; i += perPage) {
          const pageGroup = pdfs.slice(i, i + perPage)
          const cropGroup = cropBoxes.slice(i, i + perPage)
          const newPage = newPdf.addPage([pageWidth, pageHeight])
          for (let j = 0; j < perPage; j++) {
            if (j < pageGroup.length) {
              const pdf = pageGroup[j]
              const crop = cropGroup[j]
              const [firstPage] = pdf.getPages()
              
              // 嵌入时只嵌入上半部分区域
              // 在PDF坐标系中，原点(0,0)在左下角，y轴向上增长
              const [embeddedPage] = await newPdf.embedPages([firstPage], [{
                left: crop.x,
                right: crop.x + crop.width,
                top: crop.y + crop.height, // 上半部分的顶部
                bottom: crop.y           // 上半部分的底部（页面中间位置）
              }])
              
              // 用内容区宽高做缩放
              const width = crop.width
              const height = crop.height
              const maxH = contentHeight / perPage
              const maxW = contentWidth
              const scale = Math.min(maxW / width, maxH / height)
              const scaledW = width * scale
              const scaledH = height * scale
              const x = margin + (maxW - scaledW) / 2
              const yTop = pageHeight - margin - j * maxH
              const y = yTop - (maxH - scaledH) / 2 - scaledH
              
              newPage.drawPage(embeddedPage, {
                x,
                y,
                width: scaledW,
                height: scaledH
              })
            }
            if (j < perPage - 1) {
              drawDashedLine(newPage, pageHeight - margin - (j + 1) * (contentHeight / perPage), margin, margin)
            }
          }
        }
        const mergedPdfFile = await newPdf.save()
        const blob = new Blob([mergedPdfFile], { type: 'application/pdf' })
        mergedPdfBlob.value = blob
        previewUrl.value = URL.createObjectURL(blob)
      } catch (error) {
        ElMessage.error('文件合并失败：' + error.message)
        previewUrl.value = ''; // 合并失败清空预览
        mergedPdfBlob.value = null;
      }
    }

    const downloadMergedFile = () => {
      if (mergedPdfBlob.value) {
        const url = URL.createObjectURL(mergedPdfBlob.value)
        const link = document.createElement('a')
        link.href = url
        link.download = '合并行程单.pdf'
        link.click()
        URL.revokeObjectURL(url)
        ElMessage.success('文件下载成功！')
      }
    }

    return {
      fileList,
      form,
      previewUrl,
      handleFileChange,
      handleRemove,
      removeFile,
      clearFiles,
      previewMerge,
      downloadMergedFile,
      // 导出图片变量供模板使用
      pdfIcon
    }
  }
}
</script>

<style scoped>
.fphz-bg {
  min-height: 100%;
  background: #f3f5fa;
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
  overflow: auto;
}
.fphz-header-bar {
  width: 100%;
  min-width: 1200px;
  height: 56px;
  background: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.fphz-header-title {
  color: #fff;
  font-size: 28px;
  font-weight: bold;
  letter-spacing: 4px;
}
.fphz-main {
  display: flex;
  flex-direction: row;
  max-width: 1600px;
  margin: 0 1% 0 1%;
  padding: 1% 0 1% 0;
  box-sizing: border-box;
  flex-grow: 1;
  min-height: 0;
  height: 100%;
  overflow: auto;
}
.fphz-left {
  width: 30%;
  min-width: 320px;
  margin-right: 20px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  height: 100%;
  min-height: 0;
}
.fphz-filelist-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 12px #e6e8f0;
  padding: 24px 20px 18px 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  width: 100%;
  box-sizing: border-box;
  flex-grow: 1;
  overflow-y: auto;
  min-height: 0;
}
.fphz-filelist-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0;
}
.fphz-filelist-clear {
  color: #3b82f6;
  font-size: 14px;
  cursor: pointer;
  margin-left: 8px;
}

.fphz-files-area {
  flex-grow: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  padding: 0 0;
  box-sizing: border-box;
  min-height: 0;
}

/* 宫格布局，3列，自动换行 */
.fphz-filelist-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px 10px;
  margin-bottom: 28px;
  width: 100%;
  justify-items: center;
  box-sizing: border-box;
}

.fphz-file-card {
  width: 100px;
  height: 120px;
  background: #f8f9fb;
  border-radius: 10px;
  box-shadow: 0 1px 4px #f0f1f2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 12px 8px 8px 8px;
  transition: box-shadow 0.2s, border-color 0.2s;
  border: 2px solid transparent;
  cursor: pointer;
  box-sizing: border-box;
}
.fphz-file-card:hover {
  box-shadow: 0 4px 16px #e6e8f0;
  border-color: #3b82f6;
}
.fphz-file-icon {
  width: 40px;
  height: 50px;
  margin-bottom: 8px;
}
.fphz-file-name {
  font-size: 14px;
  color: #444;
  text-align: center;
  word-break: break-all;
  margin-bottom: 2px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  width: 100%;
  line-height: 1.3;
  max-height: 2.6em;
}
.fphz-file-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  color: #999;
  font-size: 18px;
  cursor: pointer;
  background: #fff;
  border-radius: 50%;
  padding: 3px;
  transition: color 0.2s, background 0.2s;
  z-index: 10;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}
.fphz-file-card:hover .fphz-file-remove {
  color: #ff4949;
  background: #fff;
}

/* 小的上传卡片样式 (文件列表不为空时) */
.fphz-upload-card-small {
  width: 90px;
  height: 110px;
  background: #f8f9fb;
  border-radius: 10px;
  box-shadow: 0 1px 4px #f0f1f2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 0;
  transition: box-shadow 0.2s, border-color 0.2s;
  border: 2px solid transparent;
  cursor: pointer;
  box-sizing: border-box;
}

.fphz-upload-card-small:hover {
  box-shadow: 0 4px 16px #e6e8f0;
  border-color: #3b82f6;
}

/* 完全控制上传组件的样式 */
.fphz-upload-card-small :deep(.el-upload) {
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.fphz-upload-card-small :deep(.el-upload-dragger) {
  width: 30px !important;
  height: 30px !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  border: none !important;
  background-color: transparent !important;
  box-sizing: border-box !important;
  margin: 0 !important;
  position: relative !important;
  overflow: visible !important;
}

.fphz-upload-card-small :deep(.el-upload-dragger .el-upload__text) {
  display: none !important;
}

.fphz-upload-card-small :deep(.el-upload-dragger .el-upload__input) {
  width: 30px !important;
  height: 30px !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  opacity: 0 !important;
  cursor: pointer !important;
}

.fphz-upload-plus-small {
  width: 30px !important;
  height: 30px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  position: relative !important;
}

.fphz-upload-plus-small .fphz-plus-icon {
  font-size: 48px !important;
  color: #bbb !important;
  font-weight: bold !important;
  line-height: 1 !important;
  transition: color 0.2s !important;
}

.fphz-upload-card-small:hover .fphz-plus-icon {
  color: #3b82f6 !important;
}

/* Large upload area style (when file list is empty) */
.fphz-upload-area-large {
  flex-grow: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f8f9fb;
  border: 2px dashed #e5e6eb;
  border-radius: 10px;
  text-align: center;
  color: #bbb;
  font-size: 18px;
  padding: 0;
  box-sizing: border-box;
}
.fphz-upload-area-large:hover {
  border-color: #3b82f6;
}

.fphz-upload-area-large :deep(.el-upload) {
  width: 100%;
  height: 100%;
}

.fphz-upload-area-large :deep(.el-upload-dragger) {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background-color: transparent;
}

.fphz-upload-plus-large {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.fphz-upload-plus-large .fphz-plus-icon {
  font-size: 80px;
  margin-bottom: 10px;
  display: block;
}

/* 尝试移除el-main的padding */
/* Removed global styles for el-main and el-container from here */

.fphz-radio-area {
  margin-top: 28px;
  border-top: 1px dashed #e5e6eb;
  padding: 18px 24px 0 24px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  box-sizing: border-box;
  flex-shrink: 0;
  min-height: 0;
}
.fphz-radio-label {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
  text-align: left;
  width: 100%;
  box-sizing: border-box;
}
.fphz-radio-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 15px;
  color: #333;
  align-items: flex-start;
  width: 100%;
  box-sizing: border-box;
}
.fphz-center {
  flex: 5.5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  margin: 0 20px;
  height: 100%;
  min-height: 0;
}
.fphz-preview-card {
  width: 100%;
  flex-grow: 1;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 2px 20px #e6e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  overflow: hidden;
  box-sizing: border-box;
  min-height: 0;
}
.fphz-preview-placeholder {
  color: #bbb;
  font-size: 22px;
  text-align: center;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.fphz-right {
  width: 18%;
  min-width: 240px;
  margin-left: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  height: 100%;
  min-height: 0;
}
.fphz-tips-card {
  width: 100%;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 12px #e6e8f0;
  padding: 24px 20px 16px 20px;
  margin-bottom: 24px;
  box-sizing: border-box;
  flex-shrink: 0;
  min-height: 0;
}
.fphz-tips-title {
  font-size: 16px;
  font-weight: bold;
  color: #3b82f6;
  margin-bottom: 12px;
}
.fphz-tips-list {
  font-size: 14px;
  color: #666;
  margin: 0;
  padding-left: 20px;
  line-height: 1.6;
}
.fphz-tips-list li {
  margin-bottom: 5px;
}
.fphz-tips-list li:last-child {
  margin-bottom: 0;
}
.fphz-download-area {
  width: 100%;
  display: flex;
  justify-content: center;
  box-sizing: border-box;
  margin-top: auto;
  min-height: 0;
  flex-shrink: 0;
}
.fphz-download-btn {
  width: 90%;
  height: 54px;
  font-size: 20px;
  border-radius: 12px;
  font-weight: bold;
  background: #3b82f6;
  border: none;
  color: #fff;
  box-shadow: 0 2px 8px #b3d1ff44;
  margin-top: 18px;
  transition: background 0.2s;
}
.fphz-download-btn:disabled {
  background: #f3f5fa;
  color: #bbb;
  box-shadow: none;
}
.fphz-blue-btn {
  background: #3b82f6 !important;
  color: #fff !important;
}

/* Adjust preview area card shadow */
.fphz-preview-card {
  box-shadow: 0 2px 20px #e6e8f0;
}

/* Hide scrollbar for file list area but keep functionality */
.fphz-filelist-card::-webkit-scrollbar {
  width: 0;
  display: none;
}

.fphz-filelist-card {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style> 