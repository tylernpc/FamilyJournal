// Load the repo-root .env (walks up from the exe dir; no-op if absent, e.g. in production).

using DbUp;
using FamilyJournalApi.Accessors;
using FamilyJournalApi.Engines;
using FamilyJournalApi.Managers;
using Microsoft.EntityFrameworkCore;
using System.Reflection;

DotNetEnv.Env.TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddDbContext<DatabaseContext>(options => options
    .UseSqlServer(builder.Configuration
    .GetConnectionString("DefaultConnection")));

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddScoped<IFamilyManager, FamilyManager>();

builder.Services.AddScoped<IFamilyAccessor, FamilyAccessor>();

builder.Services.AddScoped<ITreeEngine, TreeEngine>();

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
