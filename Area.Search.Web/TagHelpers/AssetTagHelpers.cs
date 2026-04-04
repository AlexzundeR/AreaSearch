using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Razor.TagHelpers;
using Microsoft.AspNetCore.Hosting;

namespace Area.Search.Web.TagHelpers
{
    [HtmlTargetElement("script", Attributes = "hash-asset")]
    public class ScriptHashTagHelper : TagHelper
    {
        private readonly IWebHostEnvironment _env;
        private static Dictionary<string, string> _hashMap;
        private static bool _initialized = false;

        [HtmlAttributeName("hash-asset")]
        public string HashAsset { get; set; }

        public ScriptHashTagHelper(IWebHostEnvironment env)
        {
            _env = env;
        }

        public override void Process(TagHelperContext context, TagHelperOutput output)
        {
            var src = HashAsset;
            if (string.IsNullOrEmpty(src)) return;

            if (!_initialized)
            {
                _hashMap = new Dictionary<string, string>();
                var distPath = Path.Combine(_env.ContentRootPath, "wwwroot", "dist");

                if (Directory.Exists(distPath))
                {
                    var files = Directory.GetFiles(distPath)
                        .Where(f => f.EndsWith(".js") || f.EndsWith(".css"));

                    foreach (var file in files)
                    {
                        var fileName = Path.GetFileName(file);
                        var match = Regex.Match(fileName, @"^(.+?)\.([a-f0-9]{16})\.(js|css)$");
                        if (match.Success)
                        {
                            var name = match.Groups[1].Value;
                            var ext = match.Groups[3].Value;
                            _hashMap[$"{name}.{ext}"] = fileName;
                        }
                    }
                }
                _initialized = true;
            }

            var key = src.TrimStart('/');
            if (_hashMap.TryGetValue(key, out var hashedFile))
            {
                output.TagName = "script";
                output.Attributes.Clear();
                output.Attributes.Add("src", "~/" + hashedFile);
            }
        }
    }

    [HtmlTargetElement("link", Attributes = "hash-asset")]
    public class LinkHashTagHelper : TagHelper
    {
        private readonly IWebHostEnvironment _env;
        private static Dictionary<string, string> _hashMap;
        private static bool _initialized = false;

        [HtmlAttributeName("hash-asset")]
        public string HashAsset { get; set; }

        public LinkHashTagHelper(IWebHostEnvironment env)
        {
            _env = env;
        }

        public override void Process(TagHelperContext context, TagHelperOutput output)
        {
            if (!_initialized)
            {
                _hashMap = new Dictionary<string, string>();
                var distPath = Path.Combine(_env.ContentRootPath, "wwwroot", "dist");

                if (Directory.Exists(distPath))
                {
                    var files = Directory.GetFiles(distPath)
                        .Where(f => f.EndsWith(".js") || f.EndsWith(".css"));

                    foreach (var file in files)
                    {
                        var fileName = Path.GetFileName(file);
                        var match = Regex.Match(fileName, @"^(.+?)\.([a-f0-9]{16})\.(js|css)$");
                        if (match.Success)
                        {
                            var name = match.Groups[1].Value;
                            var ext = match.Groups[3].Value;
                            _hashMap[$"{name}.{ext}"] = fileName;
                        }
                    }
                }
                _initialized = true;
            }

            var href = HashAsset;
            if (string.IsNullOrEmpty(href)) return;

            var key = href.TrimStart('/');
            if (_hashMap.TryGetValue(key, out var hashedFile))
            {
                output.Attributes.RemoveAll("hash-asset");
                output.Attributes.RemoveAll("href");
                output.Attributes.Add("href", "~/" + hashedFile);
            }
        }
    }
}
