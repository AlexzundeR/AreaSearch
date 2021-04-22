using System.Data.Common;
using System.Threading;
using System.Threading.Tasks;

using Area.Search.Domain;
using Area.Search.Repository.Contracts;

using Dapper;

using Npgsql;

namespace Area.Search.Repository
{
    public sealed class RouteRepository
    {
        private readonly ConnectionStrings _connectionStrings;

        public RouteRepository(ConnectionStrings connectionStrings)
        {
            _connectionStrings = connectionStrings;
        }

        public async Task<Route> GetRoute(long routeId, CancellationToken cancellationToken)
        {
            using (DbConnection db = CreateConnection())
            {
                var routeDb = await db.QuerySingleOrDefaultAsync<RouteDb>(
                    new CommandDefinition(
                        @"
                        SELECT 
                            ""Id"",
                            ""Name"",
                            ""LastModificationDate"",
                            ""Points""
                        FROM ""Routes""
                        WHERE ""Id"" = @route_id
",
                        new
                        {
                            route_id = routeId
                        },
                        cancellationToken: cancellationToken));

                return RouteDb.ToDomain(routeDb);
            }
        }

        public async Task<Route> UpdateRoute(Route routeToUpdate, CancellationToken cancellationToken)
        {
            using (DbConnection db = CreateConnection())
            {
                RouteDb routeToUpdateDb = RouteDb.FromDomain(routeToUpdate);

                var routeDb = await db.QuerySingleOrDefaultAsync<RouteDb>(
                    new CommandDefinition(
                        @"
                        UPDATE ""Routes"" SET 
                            ""Name"" = @name,
                            ""Points"" = @points :: json
                        WHERE ""Id"" = @route_id AND ""LastModificationDate"" = @last_modification_date
                        RETURNING
                            ""Id"",
                            ""Name"",
                            ""LastModificationDate"",
                            ""Points""
",
                        new
                        {
                            route_id = routeToUpdateDb.Id,
                            name = routeToUpdateDb.Name,
                            points = routeToUpdateDb.Points,
                            last_modification_date = routeToUpdateDb.LastModificationDate
                        },
                        cancellationToken: cancellationToken));

                return RouteDb.ToDomain(routeDb);
            }
        }

        private DbConnection CreateConnection()
        {
            return new NpgsqlConnection(_connectionStrings.AreaSearchDb);
        }
    }
}