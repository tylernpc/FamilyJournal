using FamilyJournalApi.Accessors.Entities;
using Microsoft.EntityFrameworkCore;

namespace FamilyJournalApi.Accessors;

/// <summary>
/// The schema itself comes from the DbUp scripts; this maps entities onto it.
/// Deletes never cascade in the database, so every relationship is Restrict and accessors delete children explicitly.
/// </summary>
public class DatabaseContext : DbContext
{
    public DatabaseContext(DbContextOptions<DatabaseContext> options) : base(options) { }

    public DbSet<Family> Families => Set<Family>();
    public DbSet<FamilyMember> FamilyMembers => Set<FamilyMember>();
    public DbSet<Profile> Profiles => Set<Profile>();
    public DbSet<Relationship> Relationships => Set<Relationship>();
    public DbSet<Media> Media => Set<Media>();
    public DbSet<Post> Posts => Set<Post>();
    public DbSet<PostPhoto> PostPhotos => Set<PostPhoto>();
    public DbSet<PostTag> PostTags => Set<PostTag>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<CommentMention> CommentMentions => Set<CommentMention>();
    public DbSet<Reaction> Reactions => Set<Reaction>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Invite> Invites => Set<Invite>();
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<FamilyMember>()
            .HasKey(fm => new { fm.FamilyId, fm.ProfileId });

        modelBuilder.Entity<PostPhoto>()
            .HasKey(pp => new { pp.PostId, pp.MediaId });

        modelBuilder.Entity<PostTag>()
            .HasKey(pt => new { pt.PostId, pt.ProfileId });

        modelBuilder.Entity<CommentMention>()
            .HasKey(cm => new { cm.CommentId, cm.ProfileId });

        modelBuilder.Entity<Reaction>()
            .HasIndex(r => new { r.PostId, r.ProfileId })
            .IsUnique();

        modelBuilder.Entity<Reaction>()
            .Property(r => r.Emoji)
            .HasMaxLength(32);

        modelBuilder.Entity<Invite>()
            .HasIndex(i => i.TokenHash)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.NormalizedEmail)
            .IsUnique();

        modelBuilder.Entity<RefreshToken>()
            .HasIndex(t => t.TokenHash)
            .IsUnique();

        modelBuilder.Entity<Profile>()
            .HasOne<User>().WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Profile>()
            .HasOne(p => p.PhotoMedia).WithMany()
            .HasForeignKey(p => p.PhotoMediaId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Profile>()
            .HasOne<Profile>().WithMany()
            .HasForeignKey(p => p.AddedByProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Relationship>()
            .HasOne(r => r.FromProfile).WithMany()
            .HasForeignKey(r => r.FromProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Relationship>()
            .HasOne(r => r.ToProfile).WithMany()
            .HasForeignKey(r => r.ToProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Media>()
            .HasOne<Family>().WithMany()
            .HasForeignKey(m => m.FamilyId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Media>()
            .HasOne<Profile>().WithMany()
            .HasForeignKey(m => m.UploadedByProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Post>()
            .HasOne(p => p.AuthorProfile).WithMany()
            .HasForeignKey(p => p.AuthorProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<PostTag>()
            .HasOne(pt => pt.Profile).WithMany()
            .HasForeignKey(pt => pt.ProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Comment>()
            .HasOne(c => c.AuthorProfile).WithMany()
            .HasForeignKey(c => c.AuthorProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CommentMention>()
            .HasOne<Profile>().WithMany()
            .HasForeignKey(cm => cm.ProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Reaction>()
            .HasOne(r => r.Profile).WithMany()
            .HasForeignKey(r => r.ProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Notification>()
            .HasOne(n => n.RecipientProfile).WithMany()
            .HasForeignKey(n => n.RecipientProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Notification>()
            .HasOne<Profile>().WithMany()
            .HasForeignKey(n => n.ActorProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Notification>()
            .HasOne<Post>().WithMany()
            .HasForeignKey(n => n.PostId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Invite>()
            .HasOne<Profile>().WithMany()
            .HasForeignKey(i => i.ProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Invite>()
            .HasOne<Profile>().WithMany()
            .HasForeignKey(i => i.InvitedByProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        // Every foreign key is Restrict; see the class summary
        foreach (var foreignKey in modelBuilder.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
        {
            foreignKey.DeleteBehavior = DeleteBehavior.Restrict;
        }
    }
}
