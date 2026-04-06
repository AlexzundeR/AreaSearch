using System;
using System.Threading;
using System.Threading.Tasks;
using Area.Search.Domain;
using Area.Search.Domain.Exceptions;
using Area.Search.Repository.Contracts;
using Area.Search.Services.GetRoute;
using Area.Search.Services.UpdateRoute;
using Microsoft.AspNetCore.Mvc;

namespace Area.Search.Web.Controllers.Api
{
    [Route("api/[controller]")]
    [Controller]
    public class RouteController : ControllerBase
    {
        private readonly GetRouteService _getRouteService;
        private readonly UpdateRouteService _updateRouteService;

        public RouteController(
            GetRouteService getRouteService,
            UpdateRouteService updateRouteService)
        {
            _getRouteService = getRouteService;
            _updateRouteService = updateRouteService;
        }

        [HttpGet("")]
        public async Task<Route> GetRoute([FromQuery] long routeId, CancellationToken cancellationToken)
        {
            Console.WriteLine("Rote getter");
            return await _getRouteService.GetRoute(routeId, cancellationToken);
        }

        [HttpPost("")]
        public async Task<IActionResult> UpdateRoute([FromBody] Route route, CancellationToken cancellationToken)
        {
            try
            {
                var result = await _updateRouteService.UpdateRoute(route, cancellationToken);
                return Ok(result);
            }
            catch (ConcurrentAccessException)
            {
                return StatusCode(409, new { error = "concurrent_access", description = "Данные были изменены другим пользователем. Обновите страницу." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "ServerError", description = ex.Message });
            }
        }
    }
}