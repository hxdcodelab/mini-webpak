(function (modules) {
    function require(id) {
        const [ fn, mapping ] = modules[id];
        const module = {
            exports: {}
        }
        function localRequire(filePath) {
            const id = mapping[filePath]
            return require(id)
        }
        //必须要传入require，因为后续的执行都相当于在require体内，无法mainjs等无法查到这个函数
        fn(localRequire, module, module.exports)
        return module.exports
    }
    require(1)
})({
    2: [function (require, module, exports) {
        const { foo } = require('./foo.js')
        foo()
        console.log('main.js');
    }, { './foo.js': 2 }],
    1: [function foojs(require, module, exports) {
        function foo() {
            console.log('foo')
        }
        module.exports = {
            foo
        }
    }, {}]
})


