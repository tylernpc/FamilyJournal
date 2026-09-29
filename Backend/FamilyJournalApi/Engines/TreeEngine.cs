using FamilyJournalApi.Common.Enum;
using FamilyJournalApi.Engines.Contracts;

namespace FamilyJournalApi.Engines;

/// <summary>
/// note: engines are only for really complex algorithms and (complex) business logic
/// </summary>
public class TreeEngine : ITreeEngine
{
    public const int MaxParents = 2;

    public TreeContract Build(IReadOnlyCollection<Guid> profileIds, IReadOnlyCollection<RelationshipLink> links)
    {
        var graph = new Graph(profileIds, links);
        var generations = Generations(graph);

        var nodes = profileIds
            .Select(id => new TreeNodeContract
            {
                ProfileId = id,
                Generation = generations[id],
                ParentIds = graph.Parents(id).ToList(),
                ChildIds = graph.Children(id).ToList(),
                SpouseIds = graph.Spouses(id).ToList(),
                SiblingIds = graph.Parents(id)
                    .SelectMany(graph.Children)
                    .Where(sibling => sibling != id)
                    .Distinct()
                    .ToList()
            })
            .OrderBy(n => n.Generation)
            .ToList();

        return new TreeContract
        {
            Nodes = nodes,
            Generations = nodes.Count == 0 ? 0 : nodes.Max(n => n.Generation) + 1
        };
    }

    public RelationshipCheck CheckNewLink(IReadOnlyCollection<RelationshipLink> existing, Guid fromProfileId, Guid toProfileId, RelationshipType type)
    {
        if (fromProfileId == toProfileId)
        {
            return RelationshipCheck.SameProfile;
        }

        var graph = new Graph([fromProfileId, toProfileId], existing);

        if (type == RelationshipType.SpouseOf)
        {
            // Married to your own ancestor or descendant
            return graph.IsAncestor(fromProfileId, toProfileId) || graph.IsAncestor(toProfileId, fromProfileId)
                ? RelationshipCheck.ConflictsWithExisting
                : RelationshipCheck.Ok;
        }

        // From is the parent, To is the child
        if (graph.Parents(toProfileId).Count() >= MaxParents)
        {
            return RelationshipCheck.TooManyParents;
        }

        if (graph.IsAncestor(toProfileId, fromProfileId))
        {
            return RelationshipCheck.AncestryLoop;
        }

        if (graph.Spouses(fromProfileId).Contains(toProfileId))
        {
            return RelationshipCheck.ConflictsWithExisting;
        }

        return RelationshipCheck.Ok;
    }

    /// <summary>
    /// A child sits one row below its lowest parent. Spouses share a row, so someone who married in
    /// (and has no parents in the tree) lines up with their partner. Rows are renumbered from 0.
    /// </summary>
    private static Dictionary<Guid, int> Generations(Graph graph)
    {
        var generation = graph.People.ToDictionary(id => id, _ => 0);

        // Relax until nothing moves; bounded so bad data can't loop forever
        for (var pass = 0; pass <= graph.People.Count + 1; pass++)
        {
            var changed = false;

            foreach (var id in graph.People)
            {
                var parents = graph.Parents(id).ToList();
                var target = parents.Count > 0 ? parents.Max(p => generation[p]) + 1 : generation[id];

                if (parents.Count == 0)
                {
                    // Married in: take the deepest spouse's row
                    var spouseRows = graph.Spouses(id).Select(s => generation[s]).ToList();
                    if (spouseRows.Count > 0)
                    {
                        target = Math.Max(target, spouseRows.Max());
                    }
                }

                if (target != generation[id])
                {
                    generation[id] = target;
                    changed = true;
                }
            }

            if (!changed)
            {
                break;
            }
        }

        var min = generation.Count == 0 ? 0 : generation.Values.Min();
        return generation.ToDictionary(kv => kv.Key, kv => kv.Value - min);
    }

    private sealed class Graph
    {
        private readonly Dictionary<Guid, HashSet<Guid>> parents = [];
        private readonly Dictionary<Guid, HashSet<Guid>> children = [];
        private readonly Dictionary<Guid, HashSet<Guid>> spouses = [];

        public HashSet<Guid> People { get; }

        public Graph(IEnumerable<Guid> profileIds, IEnumerable<RelationshipLink> links)
        {
            People = profileIds.ToHashSet();

            foreach (var link in links)
            {
                People.Add(link.FromProfileId);
                People.Add(link.ToProfileId);

                if (link.Type == RelationshipType.ParentOf)
                {
                    Add(parents, link.ToProfileId, link.FromProfileId);
                    Add(children, link.FromProfileId, link.ToProfileId);
                }
                else
                {
                    Add(spouses, link.FromProfileId, link.ToProfileId);
                    Add(spouses, link.ToProfileId, link.FromProfileId);
                }
            }
        }

        public IEnumerable<Guid> Parents(Guid id) => parents.GetValueOrDefault(id) ?? [];

        public IEnumerable<Guid> Children(Guid id) => children.GetValueOrDefault(id) ?? [];

        public IEnumerable<Guid> Spouses(Guid id) => spouses.GetValueOrDefault(id) ?? [];

        public bool IsAncestor(Guid ancestor, Guid of)
        {
            var seen = new HashSet<Guid>();
            var queue = new Queue<Guid>(Parents(of));

            while (queue.Count > 0)
            {
                var current = queue.Dequeue();
                if (current == ancestor)
                {
                    return true;
                }

                if (seen.Add(current))
                {
                    foreach (var parent in Parents(current))
                    {
                        queue.Enqueue(parent);
                    }
                }
            }

            return false;
        }

        private static void Add(Dictionary<Guid, HashSet<Guid>> map, Guid key, Guid value)
        {
            if (!map.TryGetValue(key, out var set))
            {
                map[key] = set = [];
            }

            set.Add(value);
        }
    }
}
