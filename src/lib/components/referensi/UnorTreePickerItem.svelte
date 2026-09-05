<script>
  import UnorTreePickerItem from './UnorTreePickerItem.svelte';

  let { 
    item, 
    selectedTargetId = null, 
    onSelectTarget = null, 
    loadChildren, 
    expandedKeys = $bindable() 
  } = $props();

  let loadingChildren = $state(false);

  let key = $derived(`${item.level}-${item.id}`);
  let isExpanded = $derived(
    item.expanded === true || (expandedKeys && expandedKeys.has(key))
  );
  let isSelected = $derived(selectedTargetId !== null && String(selectedTargetId) === String(item.id));
  let isSelectable = $derived(item.level !== 'sub-sub');

  async function toggle(e) {
    if (e) e.stopPropagation();

    if (item.hasChildren) {
      const willExpand = !isExpanded;
      if (willExpand && (!item.children || item.children.length === 0)) {
        loadingChildren = true;
        await loadChildren(item.id, item.level);
        loadingChildren = false;
      }
      if (expandedKeys) {
        if (willExpand) {
          expandedKeys.add(key);
        } else {
          expandedKeys.delete(key);
        }
        expandedKeys = new Set(expandedKeys);
      } else {
        item.expanded = willExpand;
      }
    }
  }

  function handleSelect(e) {
    if (e) e.stopPropagation();
    if (isSelectable && onSelectTarget) {
      onSelectTarget(item);
    }
  }
</script>

<div class="select-none">
  <div class="flex items-center group rounded-xl transition-all duration-150 {isSelected ? 'bg-indigo-50/90 dark:bg-indigo-950/60 ring-2 ring-indigo-500/40' : 'hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40'}">
    <!-- Expander Button (for toggling children) -->
    <button 
      type="button"
      class="w-7 h-7 flex items-center justify-center shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer rounded-lg ml-1"
      onclick={toggle}
      title={item.hasChildren ? (isExpanded ? 'Tutup cabang' : 'Buka cabang') : ''}
    >
      {#if loadingChildren}
        <span class="animate-spin h-3.5 w-3.5 border-2 border-indigo-500 border-t-transparent rounded-full"></span>
      {:else if item.hasChildren}
        <svg 
          class="w-4 h-4 transition-transform duration-200 {isExpanded ? 'rotate-90 text-indigo-500' : ''}" 
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      {:else}
        <span class="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
      {/if}
    </button>

    <!-- Row Content (Clickable to Select Target) -->
    <button 
      type="button"
      class="flex-1 flex items-center py-2 pr-3 pl-1 text-left border-none bg-transparent cursor-pointer rounded-xl transition-all"
      onclick={handleSelect}
      disabled={!isSelectable}
      title={isSelectable ? `Pilih "${item.nmUnor || item.instansi}" sebagai atasan tujuan` : 'Level sub-sub tidak dapat memiliki sub-unit'}
    >
      <!-- Icon based on Level -->
      <div class="mr-2.5 shrink-0 {isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 dark:text-zinc-500'}">
        {#if item.level === 'instansi'}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l2-4h14l2 4"/><path d="M5 21V10.85"/><path d="M19 21V10.85"/><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/></svg>
        {:else if item.level === 'induk'}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="M2 10h20"/></svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        {/if}
      </div>

      <!-- Info -->
      <div class="flex flex-col min-w-0 flex-1 pr-2">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs sm:text-sm {isSelected ? 'text-indigo-700 dark:text-indigo-300 font-bold' : 'font-medium text-zinc-900 dark:text-zinc-100'} truncate">
            {item.nmUnor || item.instansi || 'Unit Tanpa Nama'}
          </span>
          <span class="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase {item.level === 'instansi' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300' : (item.level === 'induk' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500')}">
            {item.level}
          </span>
        </div>
      </div>

      <!-- Selection Radio Indicator -->
      <div class="ml-auto flex items-center gap-1.5 shrink-0">
        {#if isSelected}
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white flex items-center gap-1 shadow-xs">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            DIPILIH
          </span>
        {:else if isSelectable}
          <div class="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-700 group-hover:border-indigo-400 transition-colors"></div>
        {/if}
      </div>
    </button>
  </div>

  <!-- Children -->
  {#if isExpanded && item.children && item.children.length > 0}
    <div class="ml-5 pl-2.5 border-l border-zinc-100 dark:border-zinc-800 space-y-1 mt-1">
      {#each item.children as child (child.id)}
        <UnorTreePickerItem 
          item={child} 
          {selectedTargetId} 
          {onSelectTarget} 
          {loadChildren} 
          bind:expandedKeys
        />
      {/each}
    </div>
  {:else if isExpanded && (!item.children || item.children.length === 0) && !loadingChildren}
    <div class="ml-8 py-1.5 text-xs text-zinc-400 italic">
      Tidak ada cabang di bawah ini.
    </div>
  {/if}
</div>
