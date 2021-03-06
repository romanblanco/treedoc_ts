import TDObjectCoder, { ICoder, ObjectCoderContext, ObjectCodeOption } from './TDObjectCoder';
import { TDNodeType } from '../TDNode';

export default class CustomCoder implements ICoder {
  public static it = new CustomCoder();
  public static get() {
    return CustomCoder.it;
  }
  private readonly DATE = new Date();
  public encode(obj: any, opt: ObjectCodeOption, target: import('..').TDNode, ctx: ObjectCoderContext): boolean {
    if (!obj.toJSON) return false;
    target.setType(TDNodeType.SIMPLE).setValue(obj.toJSON());
    return true;
  }
}
