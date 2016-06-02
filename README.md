# gulp-dev


## 安装依赖package

```
npm install
```

## 配置

package.json
配置project属性为当前开发项目名称，该名称对应cdn发布目录名
例如：project = xxxxx, cdn地址 http://img2.cache.netease.com/liveshow/project/xxxxx/

## 开发模式 

```
gulp dev
```

- 合并sprite，编译less，webpack
- 默认起本地 http://127.0.0.1:8081/ 服务，同时会起liveload服务
- 访问http://127.0.0.1:8081/html 能浏览html目录下文件
- 开发过程中修改less、script文件会及时编译，浏览器会自动更新，不需按F5刷新


## 发布页面 

```
gulp depoly
```

- 确认页面可以发布上线
- 合并sprite，编译less，webpack，生成md5hash，静态资源upload到cdn服务器
- 修改html、css文件中静态资源地址为线上cdn地址
- 默认起本地 http://127.0.0.1:8081/ 服务
- 访问http://127.0.0.1:8081/html 能浏览dist/html目录下文件