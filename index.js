import fs from 'fs';
import parser from '@babel/parser';
import traverse from '@babel/traverse';
import ejs from 'ejs';
import path from 'path';
import { transformFromAst } from 'babel-core'
import {jsonLoader} from './jsonLoader.js';
import {ChangeOutputPath} from './ChangeOutputPath.js';
import { SyncHook, AsyncParallelHook } from 'tapable';
let id = 0;

const webpackConfig={
    module:{
        rules:[
            {
                test:/\.json$/,
                use:[jsonLoader],
            }
        ]
    },
    plugins:[new ChangeOutputPath()]
}
const hooks={
    emitFile: new SyncHook(['context'])
}

function createAsset(filePath) {
    // 获取内容
    let source = fs.readFileSync(filePath, {
        encoding: 'utf-8'
    })
    const loaders=webpackConfig.module.rules;
    const loadersContext={
        addDeps(dep){
            console.log('addDeps',dep);
        }
    }
    loaders.forEach(({test,use})=>{
        if(test.test(filePath)){
            use.forEach((fn)=>{
                source=fn.call(loadersContext,source)
            })
        }
    })
    // 获取AST
    const ast = parser.parse(source, { sourceType: "module" })
    const deps = []
    traverse.default(ast, {
        ImportDeclaration({ node }) {
            deps.push(node.source.value)
        }
    })
    //使用env必须安装babel-preset-env插件
    const { code } = transformFromAst(ast, null, { presets: ["env"] })
    return {
        filePath,
        code,
        deps,
        id: id++,
        mapping: {}
    }
}

function createGraph() {
    const mainAsset = createAsset('./example/main.js')
    const queue = [mainAsset]
    for (const asset of queue) {
        asset.deps.forEach(relativePath => {
            const child = createAsset(path.resolve('./example', relativePath))
            asset.mapping[relativePath] = child.id;
            queue.push(child)
        });
    }
    return queue
}
function initPlugins() {
    const plugins=webpackConfig.plugins
    plugins.forEach((plugin)=>{
        plugin.apply(hooks)
    })
}
initPlugins()
const graph = createGraph()
const build = function (graph) {
    const template = fs.readFileSync('./bundle.ejs', { encoding: 'utf-8' });
    const data = graph.map((asset) => {
        return { id: asset.id, code: asset.code,mapping:asset.mapping }
    })
    const code = ejs.render(template, { data })
    let outputPath='./dist/bundle.js';
    const context={
        ChangeOutputPath(path){
            outputPath=path
        }
    }
    hooks.emitFile.call(context)
    fs.writeFileSync(outputPath, code)
}
build(graph)