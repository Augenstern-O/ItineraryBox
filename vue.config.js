const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  publicPath: './', // 使用相对路径，这样资源会根据当前访问路径加载
  devServer: {
    port: 7788
  },
  transpileDependencies: true,
  productionSourceMap: false, // 生产环境不生成 sourceMap
  configureWebpack: {
    performance: {
      hints: false // 关闭性能提示
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          vendors: {
            name: 'chunk-vendors',
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            chunks: 'initial'
          },
          common: {
            name: 'chunk-common',
            minChunks: 2,
            priority: -20,
            chunks: 'initial',
            reuseExistingChunk: true
          }
        }
      }
    }
  }
}) 