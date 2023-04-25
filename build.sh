cd .\Area.Search.Web\
npm install
.\node_modules\.bin\webpack --config .\webpack.config.vendor.js -e prod
.\node_modules\.bin\webpack --config .\webpack.config.js --env prod

docker build . -t area-search:latest-2023 -t area-search:latest
docker image save area-search -o ..\area-search.tz