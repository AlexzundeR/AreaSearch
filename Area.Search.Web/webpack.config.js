module.exports = {
    resolve: {
        fallback: {
            path: false,
            fs: false,
            crypto: false
        }
    },
    optimization: {
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendor',
                    chunks: 'all',
                    priority: 10
                }
            }
        }
    }
};