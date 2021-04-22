using Area.Search.Services.GetRoute;
using Area.Search.Services.UpdateRoute;

using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Area.Search.Services
{
    public static class ServicesRegistrar
    {
        public static void Configure(IServiceCollection services, IConfiguration configuration)
        {
            services.AddSingleton<GetRouteService>();
            services.AddSingleton<UpdateRouteService>();
        }
    }
}