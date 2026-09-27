namespace FamilyJournalApi.Managers.Models;

public enum ResultError
{
    // Missing, or in a family the caller can't see (never reveal which)
    NotFound,

    // The caller can see it but isn't allowed to do this
    Forbidden,

    // The request breaks a rule (validation beyond simple field checks)
    Invalid,

    // It clashes with existing state, e.g. a duplicate or the last admin
    Conflict
}

/// <summary>
/// A manager outcome: a value, or an error with a message people can read.
/// </summary>
public class Result<T>
{
    public T? Value { get; private init; }

    public ResultError? Error { get; private init; }

    public string? Message { get; private init; }

    public bool Succeeded => Error is null;

    public static Result<T> Ok(T value) => new() { Value = value };

    public static Result<T> Fail(ResultError error, string message) => new() { Error = error, Message = message };

    public static Result<T> NotFound(string message = "Not found.") => Fail(ResultError.NotFound, message);

    public static Result<T> Forbidden(string message) => Fail(ResultError.Forbidden, message);

    public static Result<T> Invalid(string message) => Fail(ResultError.Invalid, message);

    public static Result<T> Conflict(string message) => Fail(ResultError.Conflict, message);

    public static implicit operator Result<T>(T value) => Ok(value);
}

/// <summary>
/// For operations with nothing to return.
/// </summary>
public record Done
{
    public static readonly Done Value = new();
}
