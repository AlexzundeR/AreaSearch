using System;
using System.IO;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.SpaServices.AngularCli;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Area.Search.Repository;
using Area.Search.Services;
using Area.Search.Web.Helpers;
using Area.Search.Domain.Exceptions;

namespace Area.Search.Web
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        public void ConfigureServices(IServiceCollection services)
        {
            services.AddControllersWithViews()
                .AddNewtonsoftJson()
                .AddRazorRuntimeCompilation();

            services.AddSpaStaticFiles(configuration =>
            {
                configuration.RootPath = "wwwroot";
            });

            services.AddHttpContextAccessor();

            ServicesRegistrar.Configure(services, Configuration);
            RepositoryRegistrar.Configure(services, Configuration);
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            AssetHelper.Configure(env.ContentRootPath);

            app.UseStaticFiles();

            if (!env.IsDevelopment())
            {
                app.UseSpaStaticFiles();
            }

            app.UseRouting();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
                endpoints.MapControllerRoute(
                    name: "default",
                    pattern: "{controller=Home}/{action=Index}/{id?}");
            });

            app.UseExceptionHandler(errorApp =>
            {
                errorApp.Run(async context =>
                {
                    Exception? ex = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
                    
                    int statusCode = (int)HttpStatusCode.InternalServerError;
                    string errorCode = "ServerError";
                    string description = "Внутренняя ошибка сервера";

                    if (ex is ConcurrentAccessException)
                    {
                        statusCode = 409;
                        errorCode = "concurrent_access";
                        description = "Данные были изменены другим пользователем. Обновите страницу.";
                    }
                    else if (ex != null)
                    {
                        description = ex.Message;
                    }

                    context.Response.StatusCode = statusCode;
                    context.Response.ContentType = "application/json";
                    var error = new { error = errorCode, description };
                    var json = JsonSerializer.Serialize(error);
                    await context.Response.Body.WriteAsync(System.Text.Encoding.UTF8.GetBytes(json));
                });
            });

            if (env.IsDevelopment())
            {
                app.UseSpa(spa =>
                {
                    spa.Options.SourcePath = "ClientApp";
                    spa.UseProxyToSpaDevelopmentServer("http://localhost:4200");
                });
            }
        }
    }
}
