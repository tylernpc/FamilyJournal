using FamilyJournalApi.Managers;
using Microsoft.AspNetCore.Mvc;

namespace FamilyJournalApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FamiliesController(IFamilyManager familyManager) : ControllerBase
{
    
}