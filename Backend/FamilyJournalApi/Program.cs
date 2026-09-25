// Load the repo-root .env (walks up from the exe dir; no-op if absent, e.g. in production).

using DbUp;
using FamilyJournalApi.Configuration;
using System.Reflection;

DotNetEnv.Env.TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services
    .AddApiControllers()
    .AddDatabase(builder.Configuration)
    .AddFamilyJournal();

var app = builder.Build();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")!;

EnsureDatabase.For.SqlDatabase(connectionString);

var upgrader = DeployChanges.To
    .SqlDatabase(connectionString)
    .WithScriptsEmbeddedInAssembly(Assembly.GetExecutingAssembly())
    .LogToConsole()
    .Build();

upgrader.PerformUpgrade();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
