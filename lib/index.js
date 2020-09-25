const {src,dest,series,parallel,watch} = require('gulp')
const del = require('del')
const browserSync = require('browser-sync')
const loadPlugins = require('gulp-load-plugins')
const plugins = loadPlugins()
//创建开发服务器
const bs = browserSync.create()
//data:pages.config.js
const cwd = process.cwd()

//配置路径
let config = {
  //默认配置
  build:{
    src:'src',
    dist:'dist',
    temp:'temp',
    public:'public',
    paths:{
      styles:'assets/styles/*.scss',
      scripts:'assets/scripts/*.js',
      pages:'*.html',
      images:'assets/images/**',
      fonts:'assets/fonts/**'
    }
  }
}

try{
  const loadConfig = require(`${cwd}/pages.config.js`)
  config = Object.assign({},config,loadConfig)
}catch(e){}

//yarn add del --dev
const clean = ()=>{
  return del([config.build.dist,config.build.temp])
}

const style = ()=>{
    //src：源文件位置； dest：目标位置
    return src(config.build.paths.styles,{base:config.build.src,cwd:config.build.src}) //base 基准路径 保留src后面的目录结构 cwd:当前路径为src
        //以完全展开的样式转换代码 
        .pipe(plugins.sass({outputStyle:"expanded"})) //scss ->css 转换 
        .pipe(dest(config.build.temp))
        .pipe(bs.reload({stream:true}))
}
const script = ()=>{
    return src(config.build.paths.scripts,{base:config.build.src,cwd:config.build.src})
        .pipe(plugins.babel({presets:[require('@babel/preset-env')]}))
        .pipe(dest(config.build.temp))
        .pipe(bs.reload({stream:true}))
}
const page = ()=>{
    return src(config.build.paths.pages,{base:config.build.src,cwd:config.build.src})
        .pipe(plugins.swig({data:config.data,defaults:{cache:false}}))
        .pipe(dest(config.build.temp))
        .pipe(bs.reload({stream:true}))

}
const image = ()=>{
    //读取 压缩
    return src(config.build.paths.images,{base:config.build.src,cwd:config.build.src})
        .pipe(plugins.imagemin())
        .pipe(dest(config.build.dist))
}
const font = ()=>{
    //读取 压缩
    return src(config.build.paths.fonts,{base:config.build.src,cwd:config.build.src})
        .pipe(plugins.imagemin())
        .pipe(dest(config.build.dist))
}
const extra = ()=>{
    return src('**',{base:config.build.public,cwd:config.build.public})
        .pipe(dest(config.build.dist))
        
}

//单独定一个任务去启动开发服务器
const serve = ()=>{
    //watch 自动监控文件路径的通配符，根据文件的变化决定是否重新执行某个任务
    watch(config.build.paths.styles,{cwd:config.build.src},style)
    watch(config.build.paths.scripts,{cwd:config.build.src},script)
    watch(config.build.paths.pages,{cwd:config.build.src},page)

    //当下面的文件发生变化时，服务器重新请求，拿到最新的文件
    watch([
      config.build.paths.images,
      config.build.paths.fonts,
    ],{cwd:config.build.src},bs.reload)
    watch('**',{cwd:config.build.public},bs.reload)

    //初始化服务器 配置
    bs.init({ 
        //关闭页面加载时的提示
        notify:false,
        //改变端口号
        port:2000,
        //监听dist下面所有文件，当文件变化时刷新浏览器
        // files:'dist/**',
        //是否自动打开浏览器
        // open:false,
        server:{
            //网站的根目录
            baseDir:[ config.build.temp, config.build.src, config.build.public],
            //给node_modules加一个单独的路由，routes优先于baseDir中的配置
            routes: {
                //给html 中引用的/node_modules...指定根目录下的node_modules(相对路径，相对项目根目录)
                '/node_modules':'node_modules'
            }
        }
    })
}
const useref = ()=>{
    return src( config.build.paths.pages,{base: config.build.temp,cwd: config.build.temp})
        //searchPath:在dist 目录下找assets文件，在根目录下找node_modules文件
        .pipe(plugins.useref({searchPath:[ config.build.temp,'.']}))
        //压缩html css js
        .pipe(plugins.if(/\.js$/,plugins.uglify()))
        .pipe(plugins.if(/\.css$/,plugins.cleanCss()))
        .pipe(plugins.if(/\.html$/,plugins.htmlmin({
            collapseWhitespace:true,
            minifyCSS:true,
            minifyJS:true
        })))
        .pipe(dest( config.build.dist))
}



//src 下的任务
const compile = parallel(style,script,page)
//src public
const build = series(
    clean,
    parallel(
        series(compile,useref),
        image,
        font,
        extra
        )
    )
//开发阶段执行的任务
const develop = series(compile,serve)

module.exports ={
    clean,
    build,
    develop
}