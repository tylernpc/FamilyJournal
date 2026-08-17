using FamilyJournalApi.Accessors.Entities;
using Microsoft.EntityFrameworkCore;

namespace FamilyJournalApi.Accessors;

public class DatabaseContext : DbContext
{
    public DatabaseContext(DbContextOptions<DatabaseContext> options) : base(options) { }

    public DbSet<Family> Families => Set<Family>();
    public DbSet<FamilyMember> FamilyMembers => Set<FamilyMember>();
    public DbSet<Profile> Profiles => Set<Profile>();
    public DbSet<Relationship> Relationships => Set<Relationship>();
    public DbSet<Post> Posts => Set<Post>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<Reaction> Reactions => Set<Reaction>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Invite> Invites => Set<Invite>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<FamilyMember>()
            .HasKey(fm => new { fm.FamilyId, fm.ProfileId });

        modelBuilder.Entity<Reaction>()
            .HasIndex(r => new { r.PostId, r.ProfileId })
            .IsUnique();

        modelBuilder.Entity<Invite>()
            .HasIndex(i => i.Token)
            .IsUnique();

        // Restrict deletes on multi-FK paths to Profile to avoid SQL Server cascade conflicts
        modelBuilder.Entity<Relationship>()
            .HasOne(r => r.FromProfile).WithMany()
            .HasForeignKey(r => r.FromProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Relationship>()
            .HasOne(r => r.ToProfile).WithMany()
            .HasForeignKey(r => r.ToProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Post>()
            .HasOne(p => p.AuthorProfile).WithMany()
            .HasForeignKey(p => p.AuthorProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Comment>()
            .HasOne(c => c.AuthorProfile).WithMany()
            .HasForeignKey(c => c.AuthorProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Reaction>()
            .HasOne(r => r.Profile).WithMany()
            .HasForeignKey(r => r.ProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Notification>()
            .HasOne(n => n.RecipientProfile).WithMany()
            .HasForeignKey(n => n.RecipientProfileId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
