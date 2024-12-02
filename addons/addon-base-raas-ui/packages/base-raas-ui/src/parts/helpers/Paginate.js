import _ from 'lodash';
import React from 'react';
import { Dropdown, Button } from 'semantic-ui-react';

// There is a Pagination component from semantic-ui-react, but I don't like
// how it looked with the dropdown, so it was simple to make my own.
const Paginate = ({
  entriesPerPage = 25,
  siblingRange = 4,
  totalEntries = 0,
  currentPage = 1,
  onPageChange = () => {},
  onPerPageChange = () => {},
  children,
}) => {
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const perPageOptions = [5, 10, 25, 50].map(count => ({ value: count, text: `${count}  Items per page` }));
  const compressSiblings = totalPages > siblingRange * 2 + 1;

  let pages = compressSiblings ? getSiblingPages() : _.range(1, totalPages + 1);

  function handlePageChange(number) {
    return () => {
      if (compressSiblings) {
        pages = getSiblingPages(number);
      }
      onPageChange(number);
    };
  }

  function handlePerPageChange() {
    return (event, { value }) => {
      onPerPageChange(value);
    };
  }

  function getSiblingPages(number = currentPage) {
    const start = Math.max(1, number - siblingRange);
    const end = Math.min(number + siblingRange, totalPages);
    return _.range(start, end + 1);
  }

  function rightCompressed() {
    return compressSiblings && _.last(pages) < totalPages;
  }

  function leftCompressed() {
    return compressSiblings && _.first(pages) > 1;
  }

  return (
    <>
      {children}
      <div width="100%" className="ui center aligned container my2 pb2">
        <Button.Group compact basic>
          {totalEntries > entriesPerPage && (
            <>
              {leftCompressed() && (
                <Button
                  key="pagination-first-hidden"
                  icon="angle double left"
                  title="First page"
                  onClick={handlePageChange(1)}
                />
              )}
              <Button
                key="pagination-previous"
                title="Previous page"
                icon="angle left"
                disabled={currentPage === 1}
                onClick={handlePageChange(Math.max(1, currentPage - 1))}
              />
              {leftCompressed() && <Button key="pagination-previous-hidden" icon="ellipsis horizontal" disabled />}
              {pages.map(number => (
                <Button
                  key={`pagination-page-${number}`}
                  active={currentPage === number}
                  onClick={handlePageChange(number)}
                  title={`Page ${number}`}
                >
                  {number}
                </Button>
              ))}
              {rightCompressed() && <Button key="pagination-next-hidden" icon="ellipsis horizontal" disabled />}
              <Button
                key="pagination-next"
                title="Next page"
                icon="angle right"
                disabled={currentPage === totalPages}
                onClick={handlePageChange(Math.min(currentPage + 1, totalPages))}
              />
              {rightCompressed() && (
                <Button
                  key="pagination-last-hidden"
                  title="Last page"
                  icon="angle double right"
                  onClick={handlePageChange(totalPages)}
                />
              )}
            </>
          )}
          <Button>
            <Dropdown inline options={perPageOptions} defaultValue={entriesPerPage} onChange={handlePerPageChange()} />
          </Button>
        </Button.Group>
      </div>
    </>
  );
};

export default Paginate;
