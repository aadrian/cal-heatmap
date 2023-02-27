import { Position } from '../constant';
import type CalHeatmap from '../CalHeatmap';
import type { Timestamp, SubDomain } from '../index';

const BASE_CLASSNAME = 'graph-subdomain-group';
const HIGHLIGHT_CLASSNAME = 'highlight';

export default class SubDomainPainter {
  calendar: CalHeatmap;

  root: any;

  constructor(calendar: CalHeatmap) {
    this.calendar = calendar;
    this.root = null;
  }

  paint(root: any): void {
    this.root = root || this.root;

    const subDomainSvgGroup = this.root
      .selectAll(`.${BASE_CLASSNAME}`)
      .data(
        (d: Timestamp) => [d],
        (d: Timestamp) => d,
      )
      .join(
        (enter: any) => enter
          .append('svg')
          .call((selection: any) => this.#setPositions(selection))
          .attr('class', BASE_CLASSNAME),

        (update: any) =>
          // eslint-disable-next-line implicit-arrow-linebreak
          update.call((selection: any) => this.#setPositions(selection)),
      );

    const {
      subDomain: {
        radius, width, height, sort,
      },
    } = this.calendar.options.options;
    const evt = this.calendar.eventEmitter;

    subDomainSvgGroup
      .selectAll('g')
      .data((d: Timestamp) => {
        const subDomainsCollection: SubDomain[] =
          this.calendar.domainCollection.get(d)!;
        if (sort === 'desc') {
          const max = Math.max(
            ...subDomainsCollection.map((s: SubDomain) => s.x),
          );
          subDomainsCollection.forEach((s: SubDomain, i: number) => {
            subDomainsCollection[i].x = Math.abs(s.x - max);
          });
        }

        return subDomainsCollection;
      })
      .join(
        (enter: any) => enter
          .append('g')
          .call((selection: any) => selection
            .insert('rect')
            .attr('class', (d: SubDomain) => this.#classname(d.t, 'graph-rect'))
            .attr('width', width)
            .attr('height', height)
            .attr('x', (d: SubDomain) => this.#getX(d))
            .attr('y', (d: SubDomain) => this.#getY(d))
            .on('click', (ev: PointerEvent, d: SubDomain) =>
            // eslint-disable-next-line implicit-arrow-linebreak
              evt.emit('click', ev, d.t, d.v))
            .on('mouseover', (ev: PointerEvent, d: SubDomain) =>
            // eslint-disable-next-line implicit-arrow-linebreak
              evt.emit('mouseover', ev, d.t, d.v))
            .on('mouseout', (ev: PointerEvent, d: SubDomain) =>
            // eslint-disable-next-line implicit-arrow-linebreak
              evt.emit('mouseout', ev, d.t, d.v))
            .attr('rx', radius > 0 ? radius : null)
            .attr('ry', radius > 0 ? radius : null))
          .call((selection: any) => this.#appendText(selection)),
        (update: any) => update
          .selectAll('rect')
          .attr('class', (d: SubDomain) => this.#classname(d.t, 'graph-rect'))
          .attr('width', width)
          .attr('height', height)
          .attr('x', (d: SubDomain) => this.#getX(d))
          .attr('y', (d: SubDomain) => this.#getY(d))
          .attr('rx', radius)
          .attr('ry', radius),
      );
  }

  /**
   * Set the subDomain group X and Y position
   * @param {d3-selection} selection A d3-selection object
   */
  #setPositions(selection: any): void {
    const { options } = this.calendar.options;
    const { padding } = options.domain;
    const { position } = options.domain.label;

    selection
      .attr('x', () => {
        let pos = padding[Position.LEFT];
        if (position === 'left') {
          pos += options.x.domainHorizontalLabelWidth;
        }
        return pos;
      })
      .attr('y', () => {
        let pos = padding[Position.TOP];
        if (position === 'top') {
          pos += options.x.domainVerticalLabelHeight;
        }
        return pos;
      });
  }

  /**
   * Return a classname if the specified date should be highlighted
   *
   * @param  {number} timestamp Unix timestamp of the current subDomain
   * @return {String} the highlight class
   */
  #classname(timestamp: Timestamp, ...otherClasses: string[]): string {
    const { date, subDomain } = this.calendar.options.options;
    let classname = '';

    if (date.highlight.length > 0) {
      date.highlight.forEach((d) => {
        const unitFn = this.calendar.templateCollection.get(
          subDomain.type,
        ).extractUnit;

        if (unitFn(+d) === unitFn(timestamp)) {
          classname = HIGHLIGHT_CLASSNAME;
        }
      });
    }

    return [classname, ...otherClasses].join(' ').trim();
  }

  #appendText(elem: any) {
    const { options } = this.calendar.options;
    const fmt = options.subDomain.label;
    const dateFmt = this.calendar.dateHelper;

    if (!fmt) {
      return null;
    }

    return elem
      .append('text')
      .attr('class', (d: SubDomain) => this.#classname(d.t, 'subdomain-text'))
      .attr('x', (d: SubDomain) => this.#getX(d) + options.subDomain.width / 2)
      .attr('y', (d: SubDomain) => this.#getY(d) + options.subDomain.height / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .text((d: SubDomain, i: number, nodes: any[]) =>
        // eslint-disable-next-line implicit-arrow-linebreak
        dateFmt.format(d.t, fmt, d.v, nodes[i]));
  }

  #getCoordinates(axis: 'x' | 'y', d: SubDomain): number {
    const { subDomain } = this.calendar.options.options;
    return (
      d[axis] *
      (subDomain[axis === 'x' ? 'width' : 'height'] + subDomain.gutter)
    );
  }

  #getX(d: SubDomain): number {
    return this.#getCoordinates('x', d);
  }

  #getY(d: SubDomain): number {
    return this.#getCoordinates('y', d);
  }
}
