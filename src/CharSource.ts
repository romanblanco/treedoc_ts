import Bookmark from "./Bookmark";
import Predicate from "./Predicate";
import StringBuilder from "./StringBuilder";
import EOFRuntimeException from "./EOFRuntimeException";
import ParseRuntimeException from "./ParseRuntimeException";

export default abstract class CharSource {
  private static readonly MAX_STRING_LEN = 20000;
  private static readonly SPACE_CHARS =" \n\r\t";

  protected readonly bookmark = new Bookmark();

  public abstract read(): string;
  public /*abstract*/ peek(i: number = 0) { return ""; };
  public /*abstract*/ isEof(i: number = 0) { return false; };

  public getBookmark() { return this.bookmark.clone(); }
  public getPos() { return this.bookmark.pos; }
  
  /**
   * Skip chars until eof or length or predicate condition matches
   * If target is set, the skipped the chars will be saved in the target
   *
   * @return true The terminate condition matches. otherwise, could be EOF or length matches
   */
  public /*abstract*/ readUntil(predicate: Predicate<CharSource>, target?: StringBuilder, length = Number.MAX_VALUE) { return true; }
  public skipUntil(predicate: Predicate<CharSource>): boolean { return this.readUntil(predicate); }

  public readUntilTermintor(terminator: string, target?: StringBuilder, include = true, length = Number.MAX_VALUE): boolean {
    return this.readUntil(s => (terminator.indexOf(s.peek(0)) >= 0) === include, target, length);
  }

  public readUntilTermintorAsString(terminator: string, include = true): string {
    const sb = new StringBuilder();
    this.readUntilTermintor(terminator, sb, include);
    return sb.toString();
  }
  
  public skipUntilTerminator(terminator: string, include = true): boolean { return this.readUntilTermintor(terminator, undefined, include); }
  public skipSpaces(): boolean { return this.skipUntilTerminator(CharSource.SPACE_CHARS, false); }
 
  public readTostring(length: number, target?: StringBuilder): boolean {
    return this.readUntil(s => false, target, length);
  }

  public readString(length: number):  string {
    const sb = new StringBuilder();
    this.readTostring(length, sb);
    return sb.toString();
  }

  public skipLength(length: number): boolean { return this.readTostring(length); }

  public readUntilMatch(str: string, skipStr: boolean, target?: StringBuilder, length = CharSource.MAX_STRING_LEN): boolean {
    const matches = this.readUntil(s => s.startsWidth(str), target, length);
    if (matches && skipStr)
      this.skipLength(str.length);
    return matches;
  }

  public skipUntilMatch(str: string, skipStr: boolean): boolean {
    return this.readUntilMatch(str, skipStr);
  }

  // TODO: performance optimization with string.substr()
  public peekString(len: number): string {
    const sb = new StringBuilder();
    for (let i = 0; i < len; i++) {
      if (this.isEof(i))
        break;
      sb.append(this.peek(i));
    }
    return sb.toString();
  }

  public startsWidth(str: string): boolean {
    if (this.isEof(str.length))
      return false;
    for (let i=0; i<str.length; i++){
      if(this.peek(i) !== str.charAt(i))
        return false;
    }
    return true;
  }

  // For performance, avoid creating String object every time
  private getTermStrWithQuoteAndEscape(quote: string): string {
    switch (quote) {
      case '\'': return "\\'";
      case '"': return "\\\"";
      case '`': return "\\`";
      default: return "\\";
    }
  }

  public readQuotedString(quote: string): string {
    return this.readQuotedToString(quote, new StringBuilder()).toString();
  }

  public readQuotedToString(quote: string, sb: StringBuilder): StringBuilder {
    const terminator = this.getTermStrWithQuoteAndEscape(quote);
    const pos = this.getPos();
    while(true) {
      if(!this.readUntilTermintor(terminator, sb))
        throw new EOFRuntimeException("Can't find matching quote at position:" + pos);
      let c = this.read();
      if (c === quote) {
        break;
      }
      // c should be '/', tt's a escape sequence
      c = this.read();
      switch (c) {
        case 'b':
          sb.append('\b');
          break;
        case 't':
          sb.append('\t');
          break;
        case 'n':
          sb.append('\n');
          break;
        case 'f':
          sb.append('\f');
          break;
        case 'r':
          sb.append('\r');
          break;
        case 'u':
          const code = parseInt(this.readString(4), 16);
          if(Number.isNaN(code))
            throw this.createParseRuntimeException("escaped unicode with invalid number: " + code);
          break;
        case '\n':
        case '\r':
          break;   // Assume it's a line continuation
        case '"':
        case '\'':
        case '\\':
        case '`':
        case '/':
          sb.append(c);
          break;
        default:
          throw this.createParseRuntimeException("invalid escape sequence:" + c);
      }
    }

    return sb;
  }

  public createParseRuntimeException(message: string) {
    return new ParseRuntimeException(message, this.getBookmark(), this.peekString(5)); 
  }
}