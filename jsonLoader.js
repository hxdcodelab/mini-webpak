export function jsonLoader(loadersContext,source) {
    console.log('---------JsonLoader',source);
    this.addDeps("jsonLoader")
    return `export default ${source}`
}