using System;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;

namespace Area.Search.Web.Helpers
{
    public static class AssetHelper
    {
        private static string _wwwRootPath;

        public static void Configure(string contentRootPath)
        {
            _wwwRootPath = Path.Combine(contentRootPath, "wwwroot");
        }

        public static string GetHashedAssetPath(string filePath)
        {
            if (string.IsNullOrEmpty(filePath))
                return filePath;

            if (string.IsNullOrEmpty(_wwwRootPath))
            {
                _wwwRootPath = Path.Combine(AppContext.BaseDirectory, "wwwroot");
            }
            
            if (!Directory.Exists(_wwwRootPath))
                return "/" + filePath;

            var requestedFileName = Path.GetFileName(filePath);
            var requestedExt = Path.GetExtension(requestedFileName);
            
            var files = Directory.GetFiles(_wwwRootPath, "*.*", SearchOption.AllDirectories)
                .Where(f => f.EndsWith(".js") || f.EndsWith(".css"));

            var matchFile = files.FirstOrDefault(f =>
            {
                var fileName = Path.GetFileName(f);
                var match = Regex.Match(fileName, @"^" + Regex.Escape(Path.GetFileNameWithoutExtension(requestedFileName)) + @"\.[a-f0-9]{16}" + requestedExt.Replace(".", ".") + "$");
                return match.Success;
            });

            if (matchFile != null)
            {
                var relativePath = Path.GetFileName(matchFile);
                var subDir = Path.GetDirectoryName(matchFile)?.Replace(_wwwRootPath, "").Replace("\\", "/");
                if (!string.IsNullOrEmpty(subDir) && subDir != "/")
                {
                    return subDir + "/" + relativePath;
                }
                return "/" + relativePath;
            }
            
            return "/" + filePath;
        }
    }
}
