using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Area.Search.Repository
{
    public static class RepositoryRegistrar
    {
        public static void Configure(IServiceCollection services, IConfiguration configuration)
        {
            string connectionString = configuration.GetConnectionString(nameof(ConnectionStrings.AreaSearchDb));

            services.AddSingleton<ConnectionStrings>(
                new ConnectionStrings()
                {
                    AreaSearchDb = connectionString
                });

            services.AddSingleton<RouteRepository>();
        }
    }
}