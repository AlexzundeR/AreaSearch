using System;
using System.Data;
using System.Threading;
using System.Threading.Tasks;

using Area.Search.Domain;
using Area.Search.Domain.Exceptions;
using Area.Search.Repository;
using Area.Search.Repository.Contracts;

namespace Area.Search.Services.UpdateRoute
{
    public sealed class UpdateRouteService
    {
        private readonly RouteRepository _routeRepository;

        public UpdateRouteService(RouteRepository routeRepository)
        {
            _routeRepository = routeRepository;
        }

        public async Task<Route> UpdateRoute(Route routeToUpdate, CancellationToken cancellationToken)
        {
            try
            {
                Route route = await _routeRepository.UpdateRoute(routeToUpdate, cancellationToken);

                return route;
            }
            catch (DBConcurrencyException e)
            {
                throw new ConcurrentAccessException("This route has been edited by another user", e);
            }
        }
    }
}