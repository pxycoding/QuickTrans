# 快速开始

## 5分钟快速体验

### 步骤1: 安装依赖
```bash
npm install
```

### 步骤2: 创建图标（临时方案）

如果没有图标文件，可以快速创建占位图标：

**选项A: 使用在线工具**
1. 访问 https://www.favicon-generator.org/
2. 上传任意图片或使用默认图标
3. 下载16x16, 48x48, 128x128尺寸的PNG
4. 重命名并放到 `public/icons/` 目录

**选项B: 使用命令行（需要ImageMagick）**
```bash
# 创建一个简单的占位图标
convert -size 16x16 xc:blue public/icons/icon-16.png
convert -size 48x48 xc:blue public/icons/icon-48.png
convert -size 128x128 xc:blue public/icons/icon-128.png
```

**选项C: 使用Python脚本**
```python
from PIL import Image

sizes = [16, 48, 128]
for size in sizes:
    img = Image.new('RGB', (size, size), color='#1890ff')
    img.save(f'public/icons/icon-{size}.png')
```

### 步骤3: 构建项目
```bash
npm run build
```

### 步骤4: 加载到Chrome
1. 打开 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `dist` 目录

### 步骤5: 测试功能

#### 测试时间戳转换
1. 打开任意网页
2. 找到或输入一个时间戳，如：`1704067200000`
3. 选中这个数字
4. 应该会看到"📅 转换时间"按钮
5. 点击按钮查看转换结果

#### 测试二维码生成
1. 在网页中选中一个链接，如：`https://www.example.com`
2. 应该会看到"🔗 生成二维码"按钮
3. 点击按钮查看二维码

#### 测试二维码识别
1. 找一个包含二维码的网页
2. 右键点击二维码图片
3. 选择"🔍 识别二维码"
4. 查看识别结果

## 常见问题

**Q: 选中文本后没有出现按钮？**
A: 确保扩展已正确加载，刷新网页后再试。

**Q: 右键菜单没有"识别二维码"选项？**
A: 确保右键点击的是图片元素，且扩展已正确安装。

**Q: 构建失败？**
A: 检查Node.js版本（建议v18+），确保所有依赖已安装。

## 下一步

- 查看 [README.md](./README.md) 了解详细功能
- 查看 [INSTALL.md](./INSTALL.md) 了解完整安装说明
- 开始自定义和扩展功能！

