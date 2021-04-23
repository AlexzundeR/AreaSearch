using Area.Search.Domain.Exceptions;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Area.Search.Web.Middleware
{
    internal sealed class ErrorHandleMiddleware : IActionFilter, IOrderedFilter
    {
        public int Order { get; } = int.MaxValue - 10;

        public void OnActionExecuting(ActionExecutingContext context)
        {
        }

        public void OnActionExecuted(ActionExecutedContext context)
        {
            if (context.Exception is ConcurrentAccessException exception)
            {
                context.Result = new ObjectResult(
                    new
                    {
                        error = "concurrent_access"
                    })
                {
                    StatusCode = StatusCodes.Status400BadRequest
                };
                context.ExceptionHandled = true;
            }
            else if (context.Exception != null)
            {
                context.Result = new ObjectResult(
                    new
                    {
                        error = context.Exception.Message,
                        description = context.Exception.ToString()
                    })
                {
                    StatusCode = StatusCodes.Status400BadRequest
                };
                context.ExceptionHandled = true;
            }
        }
    }
}