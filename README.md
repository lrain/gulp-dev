# gulp-dev


## 安装依赖package

```
npm install
```

## 配置

package.json

cdnDomain = "http://***********"

project = "xxxxx", cdn地址 cdnDomain/liveshow/project/xxxxx/

ftp 配置 

- sftp.auth.host  ftp 服务器ip 
- sftp.auth.user.username  ftp 用户名
- sftp.auth.user.password  ftp 密码

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
gulp preview
```

- 确认页面可以发布上线
- 合并sprite，编译less，webpack，生成带md5戳文件
- 修改html、css文件中静态资源地址为dist目录带md5戳文件
- 替换cms 通用ssi文件地址为tmpl目录对应文件
- 默认起本地 http://127.0.0.1:8081/ 服务
- 访问http://127.0.0.1:8081/html 能浏览dist/html目录下文件

## 发布页面 

```
gulp depoly
```

- 确认页面可以发布上线
- 合并sprite，编译less，webpack，生成md5hash，静态资源upload到cdn服务器
- 修改html、css文件中静态资源地址为线上cdn地址
- 默认起本地 http://127.0.0.1:8081/ 服务
- 访问http://127.0.0.1:8081/html 能浏览dist/html目录下文件